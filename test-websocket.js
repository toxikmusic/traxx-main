import { WebSocket } from 'ws';

// Create WebSocket connection
const socket = new WebSocket('ws://localhost:5000/ws');

// Connection opened
socket.addEventListener('open', function (event) {
    console.log('Connected to server successfully');
    
    // Send a test message
    socket.send(JSON.stringify({ 
      type: 'ping',
      timestamp: Date.now() 
    }));
});

// Listen for messages
socket.addEventListener('message', function (event) {
    console.log('Message from server:', event.data);
});

// Handle connection close
socket.addEventListener('close', function (event) {
    console.log('Connection closed with code:', event.code);
});

// Handle errors
socket.addEventListener('error', function (event) {
    console.error('WebSocket error:', event);
});

// Disconnect after 10 seconds
setTimeout(() => {
    console.log('Closing connection...');
    socket.close();
    process.exit(0);
}, 10000);