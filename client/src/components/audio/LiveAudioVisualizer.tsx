import { useState, useRef, useEffect } from 'react';
import { useTheme } from "@/components/theme-provider";
import { cn } from '@/lib/utils';
import AudioWaveform from './AudioWaveform';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useUserSettings } from '@/hooks/useUserSettings';

interface LiveAudioVisualizerProps {
  stream?: MediaStream | null;
  audioUrl?: string;
  showControls?: boolean;
  className?: string;
  title?: string;
}

const LiveAudioVisualizer = ({
  stream,
  audioUrl,
  showControls = true,
  className = '',
  title = 'Live Audio'
}: LiveAudioVisualizerProps) => {
  const { theme } = useTheme();
  const { settings } = useUserSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAudioDetected, setIsAudioDetected] = useState(false);
  const [expandedVisualizer, setExpandedVisualizer] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyzerRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize audio component
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audioElement = audioRef.current;
    audioElementRef.current = audioElement;
    
    // Set volume
    audioElement.volume = isMuted ? 0 : volume;
    
    // If we have an audio URL, set it
    if (audioUrl) {
      audioElement.src = audioUrl;
      audioElement.crossOrigin = 'anonymous';
    }
    
    // Set up audio analysis
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      audioAnalyzerRef.current = analyser;
      
      // Create buffer for audio data
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      audioDataRef.current = dataArray;
      
      // Connect audio source based on what's available
      if (stream && stream.getAudioTracks().length > 0) {
        // For media streams (live streaming, etc.)
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        mediaStreamSourceRef.current = source;
        
        // For streams, we start playing immediately
        setIsPlaying(true);
        
        // For media streams, we also connect to destination if we want to play it
        analyser.connect(audioContext.destination);
      } else if (audioUrl) {
        // For audio elements (uploaded tracks, etc.)
        audioElement.addEventListener('canplaythrough', () => {
          try {
            const source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            // Auto-play if user settings allow
            if (settings?.enableAutoplay) {
              audioElement.play()
                .then(() => setIsPlaying(true))
                .catch(err => console.error("Error playing audio:", err));
            }
          } catch (error) {
            console.error("Error connecting audio element:", error);
          }
        }, { once: true });
      }
      
      // Start monitoring audio levels
      startAudioLevelMonitoring();
    } catch (error) {
      console.error("Error setting up audio analysis:", error);
    }
    
    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      if (mediaStreamSourceRef.current) {
        try {
          mediaStreamSourceRef.current.disconnect();
        } catch (err) {
          console.error("Error disconnecting media stream source:", err);
        }
      }
      
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (err) {
          console.error("Error closing audio context:", err);
        }
      }
    };
  }, [audioUrl, stream, settings?.enableAutoplay]);
  
  // Handle volume/muting changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // Function to monitor audio levels
  const startAudioLevelMonitoring = () => {
    const analyser = audioAnalyzerRef.current;
    const dataArray = audioDataRef.current;
    
    if (!analyser || !dataArray) return;
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      
      const average = sum / dataArray.length;
      const normalizedLevel = average / 255; // Normalize to 0-1
      
      // Update state if significant change
      if (Math.abs(normalizedLevel - audioLevel) > 0.05) {
        setAudioLevel(normalizedLevel);
      }
      
      // Detect if audio is present (above a certain threshold)
      setIsAudioDetected(normalizedLevel > 0.05);
      
      // Continue monitoring
      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };
    
    // Start monitoring
    checkAudioLevel();
  };
  
  // Handle play/pause
  const togglePlayback = () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Error playing audio:", err));
    }
  };
  
  // Handle mute toggle
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  // Calculate the visualizer height based on expanded state
  const visualizerHeight = expandedVisualizer ? 300 : 150;
  
  return (
    <Card className={cn('live-audio-visualizer overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge variant={isAudioDetected ? "default" : "secondary"} className={isAudioDetected ? "bg-green-600" : ""}>
            {isAudioDetected ? "Audio Detected" : "No Audio"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <AudioWaveform 
          audioElement={audioRef.current}
          stream={stream}
          isPlaying={true} // Always animate the visualizer even if audio is paused
          highContrastMode={settings?.highContrastMode || false}
          className="cursor-pointer"
          height={visualizerHeight}
          showControls={expandedVisualizer}
          // Toggle expanded state on click
          onClick={() => setExpandedVisualizer(!expandedVisualizer)}
        />
        
        {showControls && (
          <div className="mt-4 flex items-center space-x-2">
            <button 
              onClick={toggleMute}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            
            <Slider 
              value={[isMuted ? 0 : volume * 100]}
              min={0}
              max={100}
              step={1}
              className="w-28"
              onValueChange={(value) => {
                const newVolume = value[0] / 100;
                setVolume(newVolume);
                setIsMuted(newVolume === 0);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveAudioVisualizer;