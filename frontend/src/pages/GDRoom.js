import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const GDRoom = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peers, setPeers] = useState({}); // { socketId: { stream, name } }
  const [contributions, setContributions] = useState([]);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const socketRef = useRef();
  const localStreamRef = useRef();
  const localVideoRef = useRef();
  const screenStreamRef = useRef();
  const peerConnectionsRef = useRef({}); // { socketId: RTCPeerConnection }
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const transcriptRef = useRef('');

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  const createPeerConnection = useCallback((socketId, remoteName) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // When remote stream arrives
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setPeers(prev => ({
        ...prev,
        [socketId]: { stream: remoteStream, name: remoteName || socketId }
      }));
    };

    // Send ICE candidates via socket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          to: socketId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setPeers(prev => {
          const updated = { ...prev };
          delete updated[socketId];
          return updated;
        });
      }
    };

    peerConnectionsRef.current[socketId] = pc;
    return pc;
  }, []);

  useEffect(() => {
    // Force WebSocket transport — critical for Render deployment
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      upgrade: false
    });

    const socket = socketRef.current;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Join room after media is ready
        socket.emit('join-room', { roomId, userName: user.name });
      } catch (error) {
        console.error('Media error:', error);
        // Join without media
        socket.emit('join-room', { roomId, userName: user.name });
      }
    };

    startMedia();

    // --- Socket events ---

    // New user joined → we (existing user) create offer
    socket.on('user-joined', async ({ socketId, userName }) => {
      const pc = createPeerConnection(socketId, userName);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: socketId, offer, userName: user.name });
      } catch (err) {
        console.error('Offer error:', err);
      }
    });

    // We received an offer → send answer
    socket.on('offer', async ({ from, offer, userName: remoteName }) => {
      const pc = createPeerConnection(from, remoteName);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { to: from, answer });
      } catch (err) {
        console.error('Answer error:', err);
      }
    });

    // We received an answer
    socket.on('answer', async ({ from, answer }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Set remote desc error:', err);
        }
      }
    });

    // ICE candidate from peer
    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('ICE error:', err);
        }
      }
    });

    // User left
    socket.on('user-left', ({ socketId }) => {
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      setPeers(prev => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    });

    // Chat message
    socket.on('receive-message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('session-closed', () => {
      alert('Session has been closed.');
      navigate('/dashboard');
    });

    return () => {
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      recognitionRef.current?.stop();
      clearTimeout(silenceTimerRef.current);
      socket.disconnect();
    };
  }, [roomId, user.name, navigate, createPeerConnection]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const messageData = {
      roomId,
      message: newMessage,
      sender: user.name,
      timestamp: new Date().toLocaleTimeString()
    };
    socketRef.current.emit('send-message', messageData);
    // Don't add locally — server broadcasts back to everyone including us
    setContributions(prev => [...prev, newMessage]);
    setNewMessage('');
  };

  const sendVoiceMessage = (text) => {
    if (!text.trim()) return;
    const messageData = { roomId, message: text, sender: user.name, timestamp: new Date().toLocaleTimeString() };
    socketRef.current.emit('send-message', messageData);
    setContributions(prev => [...prev, text]);
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsVideoOn(track.enabled); }
  };

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsAudioOn(track.enabled); }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      // Replace video track in all peer connections
      const videoTrack = stream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
      setIsScreenSharing(true);
      stream.getVideoTracks()[0].onended = stopScreenShare;
    } catch (err) { console.error('Screen share error:', err); }
  };

  const stopScreenShare = async () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const videoTrack = stream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
    } catch (err) { console.error('Camera restore error:', err); }
  };

  const startVoiceMode = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Use Chrome or Edge for voice mode.'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    recognition.onstart = () => { setIsListening(true); setIsVoiceMode(true); };
    recognition.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) {
        setTranscript(prev => prev + final);
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const text = transcriptRef.current.trim();
          if (text) { sendVoiceMessage(text); setTranscript(''); }
        }, 2000);
      } else {
        setTranscript(interim);
      }
    };
    recognition.onerror = (e) => { if (e.error !== 'no-speech') console.error('Speech error:', e.error); };
    recognition.onend = () => { if (recognitionRef.current) recognition.start(); };
    recognition.start();
  };

  const stopVoiceMode = () => {
    setIsVoiceMode(false); setIsListening(false); setTranscript('');
    recognitionRef.current?.stop(); recognitionRef.current = null;
    clearTimeout(silenceTimerRef.current);
  };

  const generateEvaluation = async () => {
    if (contributions.length === 0) return;
    setEvaluating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/evaluation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gdId: roomId, gdTitle: `GD Room ${roomId}`, messageCount: contributions.length, speakingTime: 0, contributions })
      });
      const data = await res.json();
      if (data.success) { setEvaluation(data.evaluation); setShowEvaluation(true); }
    } catch (err) { console.error('Evaluation error:', err); }
    setEvaluating(false);
  };

  const leaveRoom = async () => {
    stopVoiceMode();
    socketRef.current.emit('leave-room', roomId);
    if (contributions.length > 0) await generateEvaluation();
    try {
      const { gd } = await import('../utils/api');
      const response = await gd.getAll();
      const currentGD = response.data.find(g => g.roomId === roomId);
      if (currentGD) await gd.leave(currentGD._id);
    } catch (err) { console.error('Leave error:', err); }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    if (!showEvaluation) navigate('/dashboard');
  };

  const scoreColor = (s) => s >= 75 ? '#28a745' : s >= 60 ? '#ffc107' : '#dc3545';
  const peerList = Object.entries(peers);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a' }}>

      {/* Evaluation Modal */}
      {showEvaluation && evaluation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '560px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>🎯 Your Communication Score</h2>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: scoreColor(evaluation.scores.totalScore) }}>
                {evaluation.scores.totalScore}<span style={{ fontSize: '1.5rem', color: '#666' }}>/100</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[['Clarity', evaluation.scores.clarity, '#e3f2fd'], ['Relevance', evaluation.scores.relevance, '#e8f5e9'], ['Engagement', evaluation.scores.engagement, '#fff3e0'], ['Professionalism', evaluation.scores.professionalism, '#fce4ec']].map(([label, val, bg]) => (
                <div key={label} style={{ padding: '0.75rem', background: bg, borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{label}</div>
                  <div style={{ fontWeight: 'bold' }}>{val}/25</div>
                </div>
              ))}
            </div>
            <p style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem' }}>{evaluation.feedback}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div><strong>✅ Strengths</strong><ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>{evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
              <div><strong>📈 Improve</strong><ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>{evaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
            </div>
            {evaluation.blockchainCertificate && (
              <div style={{ background: '#d4edda', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #c3e6cb' }}>
                <strong>🏆 Blockchain Certificate Issued!</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#555' }}>ID: {evaluation.blockchainCertificate.certificateId}</p>
              </div>
            )}
            <button onClick={() => { setShowEvaluation(false); navigate('/dashboard'); }}
              style={{ width: '100%', padding: '0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Close & Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ background: '#333', padding: '0.75rem 1rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>GD Room: {roomId}</h2>
          <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{peerList.length + 1} participant{peerList.length !== 0 ? 's' : ''}</span>
        </div>
        <button onClick={leaveRoom} disabled={evaluating}
          style={{ padding: '0.5rem 1rem', background: evaluating ? '#6c757d' : '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: evaluating ? 'not-allowed' : 'pointer' }}>
          {evaluating ? 'Evaluating...' : 'Leave Room'}
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video Grid */}
        <div style={{ flex: 2, padding: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Video tiles */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: peerList.length === 0 ? '1fr' : peerList.length === 1 ? '1fr 1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.75rem',
            overflow: 'auto'
          }}>
            {/* Local video */}
            <div style={{ background: '#2a2a2a', borderRadius: '8px', position: 'relative', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video ref={localVideoRef} autoPlay muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', background: '#000' }} />
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                {user.name} (You)
              </div>
            </div>

            {/* Remote videos */}
            {peerList.map(([socketId, { stream, name }]) => (
              <RemoteVideo key={socketId} stream={stream} name={name} />
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={toggleVideo} style={{ padding: '0.6rem 1.2rem', background: isVideoOn ? '#28a745' : '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isVideoOn ? '📹 Video On' : '📹 Video Off'}
            </button>
            <button onClick={toggleAudio} style={{ padding: '0.6rem 1.2rem', background: isAudioOn ? '#28a745' : '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isAudioOn ? '🎤 Mic On' : '🎤 Mic Off'}
            </button>
            <button onClick={isScreenSharing ? stopScreenShare : startScreenShare} style={{ padding: '0.6rem 1.2rem', background: isScreenSharing ? '#dc3545' : '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isScreenSharing ? '🖥️ Stop Share' : '🖥️ Share Screen'}
            </button>
            <button onClick={isVoiceMode ? stopVoiceMode : startVoiceMode} style={{ padding: '0.6rem 1.2rem', background: isVoiceMode ? '#dc3545' : '#6f42c1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {isVoiceMode ? '🔴 Stop Voice' : '🎙️ Voice Mode'}
            </button>
          </div>

          <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px', fontSize: '0.8rem' }}>
            <strong>Share:</strong>{' '}
            <span style={{ fontFamily: 'monospace' }}>{window.location.origin}/join/{roomId}</span>{' '}
            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`)}
              style={{ marginLeft: '0.5rem', padding: '0.2rem 0.6rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
              📋 Copy
            </button>
          </div>
        </div>

        {/* Chat */}
        <div style={{ width: '300px', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>
            <h3 style={{ margin: 0 }}>Chat</h3>
            {isVoiceMode && (
              <div style={{ marginTop: '0.5rem', padding: '0.4rem', background: isListening ? '#d4edda' : '#fff3cd', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'center' }}>
                {isListening ? '🎙️ Listening...' : '⏸️ Paused'}
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            {isVoiceMode && transcript && (
              <div style={{ marginBottom: '0.5rem', padding: '0.75rem', background: '#e7f3ff', border: '2px dashed #007bff', borderRadius: '4px', fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: '0.25rem' }}>🎙️ Speaking...</div>
                <div style={{ fontStyle: 'italic' }}>{transcript}</div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'white', borderRadius: '4px', fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 'bold', color: msg.sender === user.name ? '#007bff' : '#28a745' }}>{msg.sender}</div>
                <div>{msg.message}</div>
                <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.2rem' }}>{msg.timestamp}</div>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} style={{ padding: '1rem', borderTop: '1px solid #dee2e6', display: 'flex', gap: '0.5rem' }}>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isVoiceMode ? 'Voice mode active...' : 'Type a message...'}
              disabled={isVoiceMode}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', opacity: isVoiceMode ? 0.5 : 1 }} />
            <button type="submit" disabled={isVoiceMode}
              style={{ padding: '0.5rem 0.75rem', background: isVoiceMode ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: isVoiceMode ? 'not-allowed' : 'pointer' }}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Separate component to attach stream to video element
const RemoteVideo = ({ stream, name }) => {
  const videoRef = useRef();
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ background: '#2a2a2a', borderRadius: '8px', position: 'relative', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video ref={videoRef} autoPlay playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', background: '#000' }} />
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
        {name}
      </div>
    </div>
  );
};

export default GDRoom;
