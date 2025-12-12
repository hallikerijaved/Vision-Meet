import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const GDRoom = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const socketRef = useRef();
  const localVideoRef = useRef();
  const localStreamRef = useRef();
  const screenStreamRef = useRef();

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io('http://localhost:5001');
    
    // Join room
    socketRef.current.emit('join-room', roomId);
    
    // Listen for messages
    socketRef.current.on('receive-message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    // Listen for session closure
    socketRef.current.on('session-closed', () => {
      alert('Session has been closed due to no participants.');
      navigate('/dashboard');
    });

    // Initialize media
    initializeMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      socketRef.current.disconnect();
    };
  }, [roomId, navigate]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const messageData = {
        roomId,
        message: newMessage,
        sender: user.name,
        timestamp: new Date().toLocaleTimeString()
      };
      
      socketRef.current.emit('send-message', messageData);
      setMessages(prev => [...prev, messageData]);
      setNewMessage('');
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      screenStreamRef.current = screenStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }
      
      setIsScreenSharing(true);
      
      // Stop screen sharing when user stops it from browser
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    
    setIsScreenSharing(false);
    
    // Switch back to camera
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = cameraStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }
    } catch (error) {
      console.error('Error switching back to camera:', error);
    }
  };

  const leaveRoom = async () => {
    // Emit leave-room event for auto-close functionality
    socketRef.current.emit('leave-room', roomId);
    
    try {
      // Find GD by roomId and leave
      const { gd } = await import('../utils/api');
      const response = await gd.getAll();
      const currentGD = response.data.find(gdItem => gdItem.roomId === roomId);
      
      if (currentGD) {
        await gd.leave(currentGD._id);
      }
    } catch (error) {
      console.error('Error leaving GD:', error);
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate('/dashboard');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a' }}>
      {/* Header */}
      <header style={{ background: '#333', padding: '1rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>GD Room: {roomId}</h2>
        <button
          onClick={leaveRoom}
          style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Leave Room
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex' }}>
        {/* Video Area */}
        <div style={{ flex: 2, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: '#2a2a2a', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{ width: '100%', maxWidth: '600px', borderRadius: '8px', background: '#000' }}
            />
            {isScreenSharing && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#17a2b8', color: 'white', borderRadius: '4px', fontSize: '0.9rem' }}>
                🖥️ Screen Sharing Active
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={toggleVideo}
              style={{
                padding: '0.75rem 1.5rem',
                background: isVideoOn ? '#28a745' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isVideoOn ? '📹 Video On' : '📹 Video Off'}
            </button>
            <button
              onClick={toggleAudio}
              style={{
                padding: '0.75rem 1.5rem',
                background: isAudioOn ? '#28a745' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isAudioOn ? '🎤 Mic On' : '🎤 Mic Off'}
            </button>
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              style={{
                padding: '0.75rem 1.5rem',
                background: isScreenSharing ? '#dc3545' : '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isScreenSharing ? '🖥️ Stop Share' : '🖥️ Share Screen'}
            </button>

          </div>
          
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.9rem' }}>
            <strong>Share this room:</strong>
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {window.location.origin}/join/{roomId}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`);
                alert('Link copied to clipboard!');
              }}
              style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              📋 Copy Link
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ width: '300px', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
            <h3>Chat</h3>
          </div>
          
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'white', borderRadius: '4px', fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 'bold', color: '#007bff' }}>{msg.sender}</div>
                <div>{msg.message}</div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>{msg.timestamp}</div>
              </div>
            ))}
          </div>
          
          <form onSubmit={sendMessage} style={{ padding: '1rem', borderTop: '1px solid #dee2e6', display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <button
              type="submit"
              style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GDRoom;