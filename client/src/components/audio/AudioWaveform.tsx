import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, BarChart3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '@/components/theme-provider';

interface AudioWaveformProps {
  audioElement?: HTMLAudioElement | null;
  stream?: MediaStream | null;
  isPlaying: boolean;
  highContrastMode?: boolean;
  className?: string;
  showControls?: boolean;
  height?: number;
  onClick?: () => void;
}

const AudioWaveform = ({
  audioElement,
  stream,
  isPlaying,
  highContrastMode = false,
  className = '',
  showControls = false,
  height = 200,
  onClick
}: AudioWaveformProps) => {
  // Get theme from context
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [visualizationType, setVisualizationType] = useState<'waveform' | 'frequency' | 'circular'>('waveform');
  const [sensitivity, setSensitivity] = useState<number>(100);
  const [colorEffect, setColorEffect] = useState<boolean>(false);
  
  // Initialize audio analyzer
  useEffect(() => {
    // Create or reuse audio context
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    
    const audioContext = audioContextRef.current;
    
    // Create analyzer
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // This gives us more data points for a detailed waveform
    analyserRef.current = analyser;
    
    // Connect the appropriate source based on what's available
    if (sourceRef.current) {
      // Disconnect old source
      sourceRef.current.disconnect();
    }
    
    if (audioElement) {
      // For audio elements (uploaded tracks, etc.)
      try {
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        sourceRef.current = source;
      } catch (error) {
        console.error("Error connecting audio element:", error);
      }
    } else if (stream) {
      // For media streams (live streaming, etc.)
      try {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        // Note: We don't connect analyzer to destination for streams
        // as they're already playing through video element
        sourceRef.current = source;
      } catch (error) {
        console.error("Error connecting stream:", error);
      }
    }
    
    // Start rendering if playing
    if (isPlaying) {
      startRenderingVisualizer();
    }
    
    return () => {
      // Clean up
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (error) {
          console.error("Error disconnecting source:", error);
        }
      }
    };
  }, [audioElement, stream]);
  
  // Handle play/pause
  useEffect(() => {
    if (isPlaying) {
      startRenderingVisualizer();
      
      // Resume audio context if it was suspended
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    } else {
      stopRenderingVisualizer();
    }
  }, [isPlaying]);
  
  // Update visualizer based on type changes
  useEffect(() => {
    if (isPlaying) {
      // Restart rendering when visualization type changes
      stopRenderingVisualizer();
      startRenderingVisualizer();
    }
  }, [visualizationType, sensitivity, colorEffect]);
  
  const startRenderingVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    // Stop any existing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Choose the right rendering function based on visualization type
    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      
      if (visualizationType === 'waveform') {
        drawWaveform(canvasCtx, canvas);
      } else if (visualizationType === 'frequency') {
        drawFrequencyBars(canvasCtx, canvas);
      } else if (visualizationType === 'circular') {
        drawCircularVisualization(canvasCtx, canvas);
      }
    };
    
    render();
  };
  
  const stopRenderingVisualizer = () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };
  
  const drawWaveform = (
    canvasCtx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Style canvas
    const bgColor = highContrastMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.1)';
    canvasCtx.fillStyle = bgColor;
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the waveform
    const sensitivityFactor = sensitivity / 100;
    
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    
    let x = 0;
    const sliceWidth = canvas.width / bufferLength;
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');
    
    for (let i = 0; i < bufferLength; i++) {
      const v = (dataArray[i] / 128.0) * sensitivityFactor; // 128 is the center line
      const y = v * canvas.height / 2;
      
      if (colorEffect) {
        // Create gradient color based on amplitude
        const intensity = Math.abs((dataArray[i] - 128) / 128);
        const hue = (i / bufferLength * 360) % 360; // Use position for color
        canvasCtx.strokeStyle = `hsl(${hue}, ${80 * intensity}%, ${50 + (30 * intensity)}%)`;
      } else {
        // Use theme primary color
        canvasCtx.strokeStyle = primaryColor || '#7c3aed';
      }
      
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      
      x += sliceWidth;
      
      // Draw each segment to get the colorful effect
      if (colorEffect && i % 50 === 0) {
        canvasCtx.stroke();
        canvasCtx.beginPath();
        canvasCtx.moveTo(x, y);
      }
    }
    
    if (!colorEffect || bufferLength % 50 !== 0) {
      canvasCtx.stroke();
    }
  };
  
  const drawFrequencyBars = (
    canvasCtx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    
    analyser.fftSize = 256; // Lower for frequency visualization
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Style canvas
    const bgColor = highContrastMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.1)';
    canvasCtx.fillStyle = bgColor;
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    const sensitivityFactor = sensitivity / 100;
    const barWidth = (canvas.width / bufferLength) * 0.8;
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * sensitivityFactor;
      
      if (colorEffect) {
        // Create gradient color based on frequency
        const hue = (i / bufferLength * 360) % 360;
        const intensity = dataArray[i] / 255;
        canvasCtx.fillStyle = `hsl(${hue}, ${80 * intensity}%, ${50 + (30 * intensity)}%)`;
      } else {
        canvasCtx.fillStyle = primaryColor || '#7c3aed';
      }
      
      canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1; // Add 1px spacing between bars
    }
  };
  
  const drawCircularVisualization = (
    canvasCtx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    
    analyser.fftSize = 512;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Style canvas
    const bgColor = highContrastMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.1)';
    canvasCtx.fillStyle = bgColor;
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw circular visualization
    const sensitivityFactor = sensitivity / 100;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary');
    
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = (dataArray[i] / 255) * sensitivityFactor;
      const angle = (i / bufferLength) * Math.PI * 2;
      const innerRadius = radius * (0.4 + (amplitude * 0.6));
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * innerRadius;
      const y2 = centerY + Math.sin(angle) * innerRadius;
      
      canvasCtx.beginPath();
      canvasCtx.moveTo(x1, y1);
      canvasCtx.lineTo(x2, y2);
      
      if (colorEffect) {
        const hue = (i / bufferLength * 360) % 360;
        const intensity = dataArray[i] / 255;
        canvasCtx.strokeStyle = `hsl(${hue}, ${80 * intensity}%, ${50 + (30 * intensity)}%)`;
      } else {
        canvasCtx.strokeStyle = primaryColor || '#7c3aed';
      }
      
      canvasCtx.lineWidth = 2;
      canvasCtx.stroke();
    }
  };
  
  return (
    <div className={cn('audio-waveform rounded-lg overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        className="w-full h-full"
        aria-label="Interactive audio visualization"
        role="img"
        onClick={onClick}
        style={onClick ? { cursor: 'pointer' } : undefined}
      />
      
      {showControls && (
        <Card className="mt-2 p-2">
          <CardContent className="p-3 flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={visualizationType === 'waveform' ? 'default' : 'outline'}
                onClick={() => setVisualizationType('waveform')}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Waveform
              </Button>
              <Button
                size="sm"
                variant={visualizationType === 'frequency' ? 'default' : 'outline'}
                onClick={() => setVisualizationType('frequency')}
              >
                <svg 
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="4" y="4" width="2" height="16" />
                  <rect x="9" y="8" width="2" height="12" />
                  <rect x="14" y="6" width="2" height="14" />
                  <rect x="19" y="10" width="2" height="10" />
                </svg>
                Spectrum
              </Button>
              <Button
                size="sm"
                variant={visualizationType === 'circular' ? 'default' : 'outline'}
                onClick={() => setVisualizationType('circular')}
              >
                <svg 
                  className="h-4 w-4 mr-1"
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                Circular
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Sensitivity:</span>
              <Slider
                value={[sensitivity]}
                min={50}
                max={200}
                step={5}
                className="w-[100px]"
                onValueChange={(value) => setSensitivity(value[0])}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm mr-1">Color Effects:</span>
              <Switch
                checked={colorEffect}
                onCheckedChange={setColorEffect}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AudioWaveform;