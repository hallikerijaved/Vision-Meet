import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navigation from '../components/Navigation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

function RealTimeInterview({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('setup');
  const [mode, setMode] = useState('chat');
  const [role, setRole] = useState('Java Developer');
  const [difficulty, setDifficulty] = useState('Easy');
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [results, setResults] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [statusText, setStatusText] = useState('Ready');
  const [jobDescription, setJobDescription] = useState('');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const silenceTimerRef = useRef(null);
  const transcriptRef = useRef('');
  const isSpeakingRef = useRef(false);
  const voiceModeActiveRef = useRef(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const processVoiceResponse = async () => {
    const capturedAnswer = transcriptRef.current.trim();
    if (!capturedAnswer || isSpeakingRef.current) {
      return;
    }

    setMessages((previous) => [...previous, { type: 'user', text: capturedAnswer }]);
    setTranscript('');
    transcriptRef.current = '';
    setStatusText('Thinking');
    await sendMessage(capturedAnswer);
  };

  const resetSilenceTimer = React.useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {
      if (mode === 'voice' && transcriptRef.current.trim() && !isSpeakingRef.current) {
        processVoiceResponse();
      }
    }, 1800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (step === 'interview') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error('Camera access denied:', err));
    }
  }, [step]);

  useEffect(() => {
    voiceModeActiveRef.current = mode === 'voice' && step === 'interview';
  }, [mode, step]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return undefined;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synth = synthRef.current;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = mode === 'voice';
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event) => {
      if (mode === 'chat') {
        const text = event.results[0][0].transcript;
        setUserInput(text);
        setIsListening(false);
        setStatusText('Voice captured');
        return;
      }

      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          finalTranscript += `${event.results[i][0].transcript} `;
        }
      }

      if (finalTranscript) {
        setTranscript((previous) => previous + finalTranscript);
        resetSilenceTimer();
      }
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
      setStatusText('Microphone error');
    };

    recognitionRef.current.onend = () => {
      const shouldResume = voiceModeActiveRef.current && !isSpeakingRef.current;
      if (!shouldResume) {
        setIsListening(false);
        return;
      }

      setTimeout(() => {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          setStatusText('Listening');
        } catch (error) {
          setIsListening(false);
        }
      }, 250);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synth.cancel();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [mode, step, resetSilenceTimer]);

  const speakText = (text) => new Promise((resolve) => {
    if (mode !== 'voice' || !text) {
      resolve();
      return;
    }

    if (synthRef.current.paused) {
      synthRef.current.resume();
    }

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Assign a voice to prevent silent errors
    const voices = synthRef.current.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsSpeaking(true);
      setStatusText('AI speaking');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Recognition may already be stopped.
        }
      }
    };
    utterance.onerror = (e) => {
      console.error('SpeechSynthesis Error:', e);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      if (voiceModeActiveRef.current) setStatusText('Listening');
      resolve();
    };
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      if (voiceModeActiveRef.current) {
        setStatusText('Listening');
      }
      resolve();
    };

    // Chrome bug fallback for long strings without onend firing
    const fallbackDuration = Math.max(text.length * 100, 3000);
    const fallbackTimeout = setTimeout(() => {
      if (isSpeakingRef.current) {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        if (voiceModeActiveRef.current) setStatusText('Listening');
        resolve();
      }
    }, fallbackDuration);

    const originalOnEnd = utterance.onend;
    utterance.onend = () => {
      clearTimeout(fallbackTimeout);
      originalOnEnd();
    };

    synthRef.current.speak(utterance);
  });

  const startInterview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/realtime-interview/start`,
        { role, difficulty, jobDescription },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSessionId(response.data.sessionId);
      setMessages([
        { type: 'ai', text: response.data.greeting },
        { type: 'ai', text: response.data.firstQuestion }
      ]);
      setCurrentQuestion(response.data.firstQuestion);
      setQuestionCount(1);
      setStep('interview');
      setStatusText(mode === 'voice' ? 'AI speaking' : 'Interview started');

      if (mode === 'voice') {
        await speakText(response.data.greeting);
        await speakText(response.data.firstQuestion);
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsListening(true);
          setStatusText('Listening');
        }
      }
    } catch (error) {
      alert('Error starting interview');
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported');
      return;
    }

    setIsListening(true);
    setStatusText('Listening');
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setStatusText('Paused');
  };

  const sendMessage = async (messageText) => {
    const textToSend = messageText || userInput.trim();
    if (!textToSend || isAITyping) {
      return;
    }

    if (!messageText) {
      setMessages((previous) => [...previous, { type: 'user', text: textToSend }]);
    }

    setUserInput('');
    setIsAITyping(true);
    setStatusText('Thinking');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/realtime-interview/respond`,
        { sessionId, userAnswer: textToSend, currentQuestion },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTimeout(async () => {
        if (response.data.completed) {
          setMessages((previous) => [
            ...previous,
            { type: 'ai', text: response.data.feedback },
            { type: 'ai', text: response.data.closingMessage }
          ]);

          if (mode === 'voice') {
            await speakText(response.data.feedback);
            await speakText(response.data.closingMessage);
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }

          setCurrentQuestion('');
          setResults(response.data.results);
          setStatusText('Interview complete');
          setTimeout(() => setStep('results'), 1800);
        } else {
          setMessages((previous) => [
            ...previous,
            { type: 'ai', text: response.data.feedback },
            { type: 'ai', text: response.data.nextQuestion }
          ]);

          setCurrentQuestion(response.data.nextQuestion);
          if (mode === 'voice') {
            await speakText(response.data.feedback);
            await speakText(response.data.nextQuestion);
          }

          setQuestionCount((previous) => previous + 1);
          setStatusText(mode === 'voice' ? 'Listening' : 'Waiting for your answer');
        }

        setIsAITyping(false);
      }, 1000);
    } catch (error) {
      setIsAITyping(false);
      setStatusText('Error');
      alert('Error sending message');
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Navigation user={user} />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        {step === 'setup' && (
          <div style={{ background: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '30px', color: '#333' }}>AI Mock Interview</h1>

            <div style={{ marginBottom: '30px', display: 'flex', gap: '15px' }}>
              <button
                onClick={() => setMode('chat')}
                style={{
                  flex: 1,
                  padding: '20px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: mode === 'chat' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f0f0f0',
                  color: mode === 'chat' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Chat Mode
                <br />
                <span style={{ fontSize: '12px', fontWeight: 'normal' }}>Type or tap the mic</span>
              </button>
              <button
                onClick={() => setMode('voice')}
                style={{
                  flex: 1,
                  padding: '20px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: mode === 'voice' ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f0f0f0',
                  color: mode === 'voice' ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Voice Call
                <br />
                <span style={{ fontSize: '12px', fontWeight: 'normal' }}>Continuous conversation flow</span>
              </button>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#555' }}>Select Role:</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ddd' }}
              >
                <option>Java Developer</option>
                <option>Full Stack</option>
                <option>HR</option>
                <option>Custom Role</option>
              </select>
            </div>

            {role === 'Custom Role' && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#555' }}>Job Description (Optional):</label>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  placeholder="Paste the job requirements here so the AI can tailor the questions..."
                  style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ddd', minHeight: '100px', resize: 'vertical' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#555' }}>Select Difficulty:</label>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                style={{ width: '100%', padding: '12px', fontSize: '16px', borderRadius: '8px', border: '2px solid #ddd' }}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>

            {mode === 'voice' && (
              <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '30px', border: '2px solid #ffc107' }}>
                <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                  <strong>Voice mode:</strong> speak naturally, pause when done, and the interviewer will respond automatically.
                </p>
              </div>
            )}

            <button
              onClick={startInterview}
              style={{ width: '100%', padding: '15px', fontSize: '18px', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
            >
              {mode === 'chat' ? 'Start Chat Interview' : 'Start Voice Interview'}
            </button>
          </div>
        )}

        {step === 'interview' && mode === 'chat' && (
          <div style={{ position: 'relative', background: 'white', borderRadius: '15px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {/* Webcam Tile */}
            <div style={{ position: 'absolute', bottom: '30px', right: '30px', width: '200px', height: '150px', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', border: '3px solid white', backgroundColor: '#000', zIndex: 10 }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f0f0f0' }}>
              <div>
                <h2 style={{ margin: 0, color: '#667eea', fontSize: '24px' }}>AI Interviewer</h2>
                <p style={{ margin: '5px 0 0 0', color: '#999', fontSize: '14px' }}>{role} - {difficulty}</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ background: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                  Question {questionCount}/5
                </div>
                <div style={{ background: '#111827', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                  {statusText}
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', padding: '10px' }}>
              {messages.map((message, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start', marginBottom: '15px' }}>
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '12px 18px',
                      borderRadius: message.type === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
                      background: message.type === 'user' ? '#667eea' : '#f0f0f0',
                      color: message.type === 'user' ? 'white' : '#333',
                      fontSize: '15px',
                      lineHeight: '1.5'
                    }}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              {isAITyping && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '15px' }}>
                  <div style={{ padding: '12px 18px', borderRadius: '18px 18px 18px 0', background: '#f0f0f0', color: '#999' }}>
                    AI is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isAITyping}
                style={{
                  padding: '12px 20px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: isListening ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: isAITyping ? 'not-allowed' : 'pointer',
                  opacity: isAITyping ? 0.5 : 1
                }}
              >
                {isListening ? 'Stop' : 'Speak'}
              </button>
              <textarea
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type or speak your answer..."
                disabled={isAITyping || isListening}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '15px',
                  borderRadius: '10px',
                  border: '2px solid #ddd',
                  resize: 'none',
                  minHeight: '60px',
                  fontFamily: 'inherit',
                  opacity: isListening ? 0.5 : 1
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!userInput.trim() || isAITyping || isListening}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: userInput.trim() && !isAITyping && !isListening ? '#667eea' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: userInput.trim() && !isAITyping && !isListening ? 'pointer' : 'not-allowed'
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {step === 'interview' && mode === 'voice' && (
          <div style={{ position: 'relative', background: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            {/* Webcam Tile */}
            <div style={{ position: 'absolute', bottom: '30px', right: '30px', width: '200px', height: '150px', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', border: '3px solid white', backgroundColor: '#000', zIndex: 10 }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  margin: '0 auto 20px',
                  borderRadius: '50%',
                  background: isSpeaking ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '60px',
                  animation: isSpeaking ? 'pulse 1s infinite' : 'none'
                }}
              >
                AI
              </div>
              <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '28px' }}>AI Interviewer</h2>
              <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>{role} - {difficulty}</p>
              <div style={{ marginTop: '15px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    background: isSpeaking ? '#667eea' : '#28a745',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {isSpeaking ? 'AI speaking' : 'Your turn'}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: '10px',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    background: '#10b981',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  Question {questionCount}/5
                </span>
              </div>
              <p style={{ marginTop: '12px', color: '#4b5563', fontWeight: 'bold' }}>Status: {statusText}</p>
            </div>

            {transcript && (
              <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '2px solid #667eea' }}>
                <p style={{ margin: 0, color: '#667eea', fontWeight: 'bold', marginBottom: '10px' }}>You are saying:</p>
                <p style={{ margin: 0, color: '#333', fontSize: '16px' }}>{transcript}</p>
              </div>
            )}

            <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8f9fa', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>Conversation Log:</h3>
              {messages.map((message, index) => (
                <div key={index} style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', background: message.type === 'ai' ? '#e3f2fd' : '#f1f8e9', borderLeft: `4px solid ${message.type === 'ai' ? '#667eea' : '#28a745'}` }}>
                  <strong style={{ color: message.type === 'ai' ? '#667eea' : '#28a745' }}>
                    {message.type === 'ai' ? 'AI:' : 'You:'}
                  </strong>
                  <p style={{ margin: '5px 0 0 0', color: '#333' }}>{message.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                if (recognitionRef.current) {
                  recognitionRef.current.stop();
                }
                synthRef.current.cancel();
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                }
                navigate('/dashboard');
              }}
              style={{ width: '100%', padding: '15px', fontSize: '18px', fontWeight: 'bold', background: '#dc3545', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
            >
              End Interview
            </button>
          </div>
        )}

        {step === 'results' && results && (
          <div style={{ background: 'white', borderRadius: '15px', padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '30px', color: '#333', textAlign: 'center' }}>Interview Complete</h1>

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', padding: '30px 50px', borderRadius: '15px' }}>
                <h2 style={{ fontSize: '48px', margin: '0' }}>{results.overallScore}/10</h2>
                <p style={{ margin: '10px 0 0 0', fontSize: '18px' }}>Overall Score</p>
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ color: '#10b981', marginBottom: '10px' }}>Strengths</h3>
              {results.strengths.map((strength, index) => (
                <p key={index} style={{ marginLeft: '20px', color: '#555' }}> {strength}</p>
              ))}
            </div>

            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ color: '#ef4444', marginBottom: '10px' }}>Areas to Improve</h3>
              {results.weaknesses.map((weakness, index) => (
                <p key={index} style={{ marginLeft: '20px', color: '#555' }}> {weakness}</p>
              ))}
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#667eea', marginBottom: '10px' }}>Improvement Tips</h3>
              {results.improvements.map((tip, index) => (
                <p key={index} style={{ marginLeft: '20px', color: '#555' }}> {tip}</p>
              ))}
            </div>

            <button
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach(track => track.stop());
                }
                navigate('/dashboard');
              }}
              style={{ width: '100%', padding: '15px', fontSize: '18px', fontWeight: 'bold', background: '#667eea', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

export default RealTimeInterview;
