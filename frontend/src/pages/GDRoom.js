import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';
const API_URL   = process.env.REACT_APP_API_URL    || 'http://localhost:5001/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/* ── tiny helper: attach stream to <video> ── */
const RemoteVideo = ({ stream, name }) => {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div style={tileStyle}>
      <video ref={ref} autoPlay playsInline style={videoStyle} />
      <span style={labelStyle}>{name}</span>
    </div>
  );
};

export default function GDRoom({ user }) {
  const { roomId }  = useParams();
  const navigate    = useNavigate();

  /* ── UI state ── */
  const [messages,       setMessages]       = useState([]);
  const [newMessage,     setNewMessage]     = useState('');
  const [peers,          setPeers]          = useState({});   // { id: {stream,name} }
  const [isVideoOn,      setIsVideoOn]      = useState(true);
  const [isAudioOn,      setIsAudioOn]      = useState(true);
  const [isScreenShare,  setIsScreenShare]  = useState(false);
  const [isVoiceMode,    setIsVoiceMode]    = useState(false);
  const [isListening,    setIsListening]    = useState(false);
  const [transcript,     setTranscript]     = useState('');
  const [contributions,  setContributions]  = useState([]);
  const [evaluation,     setEvaluation]     = useState(null);
  const [showEval,       setShowEval]       = useState(false);
  const [evaluating,     setEvaluating]     = useState(false);

  /* ── stable refs (never cause re-renders) ── */
  const socketRef       = useRef(null);
  const localVideoRef   = useRef(null);
  const localStreamRef  = useRef(null);
  const screenStreamRef = useRef(null);
  const pcsRef          = useRef({});          // { socketId: RTCPeerConnection }
  const recognitionRef  = useRef(null);
  const silenceRef      = useRef(null);
  const transcriptRef   = useRef('');

  /* keep transcriptRef in sync */
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  /* ════════════════════════════════════════════
     createPC — always reads localStreamRef.current
     at call-time so tracks are never stale
  ════════════════════════════════════════════ */
  function createPC(socketId, remoteName) {
    if (pcsRef.current[socketId]) return pcsRef.current[socketId];

    const pc = new RTCPeerConnection(ICE_SERVERS);

    /* add local tracks NOW (stream is ready by this point) */
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    pc.ontrack = ({ streams: [remote] }) => {
      setPeers(prev => ({ ...prev, [socketId]: { stream: remote, name: remoteName } }));
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socketRef.current.emit('ice-candidate', { to: socketId, candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        pc.close();
        delete pcsRef.current[socketId];
        setPeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
      }
    };

    pcsRef.current[socketId] = pc;
    return pc;
  }

  /* ════════════════════════════════════════════
     Main effect — runs once
  ════════════════════════════════════════════ */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'], upgrade: false });
    socketRef.current = socket;

    /* 1. get media FIRST, then join room */
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch(err => console.warn('Camera/mic denied:', err))
      .finally(() => {
        socket.emit('join-room', { roomId, userName: user.name });
      });

    /* ── signalling ── */

    /* existing user → new joiner sends offer */
    socket.on('user-joined', async ({ socketId, userName }) => {
      const pc = createPC(socketId, userName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: socketId, offer, userName: user.name });
    });

    socket.on('offer', async ({ from, offer, userName: rName }) => {
      const pc = createPC(from, rName);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    });

    socket.on('answer', async ({ from, answer }) => {
      const pc = pcsRef.current[from];
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = pcsRef.current[from];
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (_) {}
      }
    });

    socket.on('user-left', ({ socketId }) => {
      pcsRef.current[socketId]?.close();
      delete pcsRef.current[socketId];
      setPeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
    });

    /* ── chat ── */
    socket.on('receive-message', data => {
      setMessages(prev => [...prev, data]);
    });

    socket.on('session-closed', () => {
      alert('Session has been closed.');
      navigate('/dashboard');
    });

    return () => {
      Object.values(pcsRef.current).forEach(pc => pc.close());
      pcsRef.current = {};
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      recognitionRef.current?.stop();
      clearTimeout(silenceRef.current);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── chat send ── */
  const sendMessage = e => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = { roomId, message: newMessage, sender: user.name, timestamp: new Date().toLocaleTimeString() };
    socketRef.current.emit('send-message', msg);
    setContributions(p => [...p, newMessage]);
    setNewMessage('');
  };

  const sendVoiceMsg = text => {
    if (!text.trim()) return;
    const msg = { roomId, message: text, sender: user.name, timestamp: new Date().toLocaleTimeString() };
    socketRef.current.emit('send-message', msg);
    setContributions(p => [...p, text]);
  };

  /* ── media controls ── */
  const toggleVideo = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsVideoOn(t.enabled); }
  };
  const toggleAudio = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setIsAudioOn(t.enabled); }
  };

  const startScreenShare = async () => {
    try {
      const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = ss;
      if (localVideoRef.current) localVideoRef.current.srcObject = ss;
      const vt = ss.getVideoTracks()[0];
      Object.values(pcsRef.current).forEach(pc => {
        const s = pc.getSenders().find(s => s.track?.kind === 'video');
        if (s) s.replaceTrack(vt);
      });
      setIsScreenShare(true);
      vt.onended = stopScreenShare;
    } catch (_) {}
  };

  const stopScreenShare = async () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setIsScreenShare(false);
    try {
      const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = cam;
      if (localVideoRef.current) localVideoRef.current.srcObject = cam;
      const vt = cam.getVideoTracks()[0];
      Object.values(pcsRef.current).forEach(pc => {
        const s = pc.getSenders().find(s => s.track?.kind === 'video');
        if (s) s.replaceTrack(vt);
      });
    } catch (_) {}
  };

  /* ── voice mode ── */
  const startVoiceMode = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Use Chrome or Edge for voice mode.'); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    recognitionRef.current = r;
    r.onstart = () => { setIsVoiceMode(true); setIsListening(true); };
    r.onresult = event => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' '; else interim += t;
      }
      if (final) {
        setTranscript(p => p + final);
        clearTimeout(silenceRef.current);
        silenceRef.current = setTimeout(() => {
          const txt = transcriptRef.current.trim();
          if (txt) { sendVoiceMsg(txt); setTranscript(''); }
        }, 2000);
      } else { setTranscript(interim); }
    };
    r.onerror = e => { if (e.error !== 'no-speech') console.error(e.error); };
    r.onend = () => { if (recognitionRef.current) r.start(); };
    r.start();
  };

  const stopVoiceMode = () => {
    recognitionRef.current?.stop(); recognitionRef.current = null;
    clearTimeout(silenceRef.current);
    setIsVoiceMode(false); setIsListening(false); setTranscript('');
  };

  /* ── evaluation ── */
  const generateEvaluation = async () => {
    if (!contributions.length) return;
    setEvaluating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/evaluation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gdId: roomId, gdTitle: `GD Room ${roomId}`, messageCount: contributions.length, speakingTime: 0, contributions }),
      });
      const data = await res.json();
      if (data.success) { setEvaluation(data.evaluation); setShowEval(true); }
    } catch (_) {}
    setEvaluating(false);
  };

  const leaveRoom = async () => {
    stopVoiceMode();
    socketRef.current?.emit('leave-room', roomId);
    if (contributions.length) await generateEvaluation();
    try {
      const { gd } = await import('../utils/api');
      const res = await gd.getAll();
      const cur = res.data.find(g => g.roomId === roomId);
      if (cur) await gd.leave(cur._id);
    } catch (_) {}
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    if (!showEval) navigate('/dashboard');
  };

  const sc = s => s >= 75 ? '#28a745' : s >= 60 ? '#ffc107' : '#dc3545';
  const peerList = Object.entries(peers);
  const total = peerList.length + 1;
  const cols = total === 1 ? '1fr' : total === 2 ? '1fr 1fr' : total <= 4 ? '1fr 1fr' : 'repeat(3, 1fr)';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a1a' }}>

      {/* ── Evaluation modal ── */}
      {showEval && evaluation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '540px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center' }}>🎯 Communication Score</h2>
            <div style={{ textAlign: 'center', margin: '1rem 0' }}>
              <span style={{ fontSize: '3.5rem', fontWeight: 'bold', color: sc(evaluation.scores.totalScore) }}>{evaluation.scores.totalScore}</span>
              <span style={{ color: '#666' }}>/100</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              {[['Clarity', evaluation.scores.clarity, '#e3f2fd'], ['Relevance', evaluation.scores.relevance, '#e8f5e9'], ['Engagement', evaluation.scores.engagement, '#fff3e0'], ['Professionalism', evaluation.scores.professionalism, '#fce4ec']].map(([l, v, bg]) => (
                <div key={l} style={{ padding: '0.6rem', background: bg, borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{l}</div>
                  <div style={{ fontWeight: 'bold' }}>{v}/25</div>
                </div>
              ))}
            </div>
            <p style={{ background: '#f8f9fa', padding: '0.75rem', borderRadius: '6px', fontSize: '0.9rem' }}>{evaluation.feedback}</p>
            {evaluation.blockchainCertificate && (
              <div style={{ background: '#d4edda', padding: '0.75rem', borderRadius: '6px', marginTop: '0.75rem', border: '1px solid #c3e6cb' }}>
                <strong>🏆 Certificate Issued!</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#555' }}>ID: {evaluation.blockchainCertificate.certificateId}</p>
              </div>
            )}
            <button onClick={() => { setShowEval(false); navigate('/dashboard'); }}
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Close & Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ background: '#222', padding: '0.6rem 1rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 'bold' }}>GD Room: {roomId}</span>
          <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#aaa' }}>{total} participant{total > 1 ? 's' : ''}</span>
        </div>
        <button onClick={leaveRoom} disabled={evaluating}
          style={{ padding: '0.4rem 1rem', background: evaluating ? '#555' : '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {evaluating ? 'Evaluating…' : 'Leave Room'}
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Video grid ── */}
        <div style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: cols, gap: '0.6rem', overflow: 'auto', marginBottom: '0.6rem' }}>

            {/* local */}
            <div style={tileStyle}>
              <video ref={localVideoRef} autoPlay muted playsInline style={videoStyle} />
              <span style={labelStyle}>{user.name} (You)</span>
            </div>

            {/* remote peers */}
            {peerList.map(([id, { stream, name }]) => (
              <RemoteVideo key={id} stream={stream} name={name} />
            ))}
          </div>

          {/* controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {[
              [toggleVideo,  isVideoOn  ? '📹 Video On'    : '📹 Video Off',   isVideoOn  ? '#28a745' : '#dc3545'],
              [toggleAudio,  isAudioOn  ? '🎤 Mic On'      : '🎤 Mic Off',     isAudioOn  ? '#28a745' : '#dc3545'],
              [isScreenShare ? stopScreenShare : startScreenShare, isScreenShare ? '🖥️ Stop Share' : '🖥️ Share Screen', isScreenShare ? '#dc3545' : '#17a2b8'],
              [isVoiceMode   ? stopVoiceMode   : startVoiceMode,   isVoiceMode   ? '🔴 Stop Voice'  : '🎙️ Voice Mode',  isVoiceMode   ? '#dc3545' : '#6f42c1'],
            ].map(([fn, label, bg]) => (
              <button key={label} onClick={fn} style={{ padding: '0.5rem 1rem', background: bg, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#ccc' }}>
            Share: <span style={{ fontFamily: 'monospace' }}>{window.location.origin}/join/{roomId}</span>
            <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${roomId}`)}
              style={{ marginLeft: '0.5rem', padding: '0.15rem 0.5rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }}>
              Copy
            </button>
          </div>
        </div>

        {/* ── Chat ── */}
        <div style={{ width: '280px', background: '#f8f9fa', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ddd' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>
            💬 Chat
            {isVoiceMode && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: isListening ? '#28a745' : '#ffc107' }}>
                {isListening ? '● Listening' : '⏸ Paused'}
              </span>
            )}
          </div>

          <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {messages.length === 0 && (
              <div style={{ color: '#aaa', fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>No messages yet</div>
            )}
            {isVoiceMode && transcript && (
              <div style={{ padding: '0.5rem', background: '#e7f3ff', border: '2px dashed #007bff', borderRadius: '4px', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 'bold', color: '#007bff', fontSize: '0.75rem' }}>🎙️ Speaking…</div>
                <div style={{ fontStyle: 'italic' }}>{transcript}</div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.sender === user.name;
              return (
                <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '2px', textAlign: isMe ? 'right' : 'left' }}>{msg.sender}</div>
                  <div style={{ padding: '0.4rem 0.7rem', background: isMe ? '#007bff' : 'white', color: isMe ? 'white' : '#333', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', fontSize: '0.88rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                    {msg.message}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#bbb', marginTop: '2px', textAlign: isMe ? 'right' : 'left' }}>{msg.timestamp}</div>
                </div>
              );
            })}
          </div>

          <form onSubmit={sendMessage} style={{ padding: '0.75rem', borderTop: '1px solid #dee2e6', display: 'flex', gap: '0.4rem' }}>
            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
              placeholder={isVoiceMode ? 'Voice mode on…' : 'Type a message…'}
              disabled={isVoiceMode}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '20px', fontSize: '0.88rem', outline: 'none' }} />
            <button type="submit" disabled={isVoiceMode}
              style={{ padding: '0.5rem 0.9rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.85rem' }}>
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── shared styles ── */
const tileStyle = {
  background: '#2a2a2a', borderRadius: '8px', position: 'relative',
  minHeight: '180px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const videoStyle = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const labelStyle = {
  position: 'absolute', bottom: '6px', left: '8px',
  background: 'rgba(0,0,0,0.6)', color: 'white',
  padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem'
};
