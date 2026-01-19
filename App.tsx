
import React, { useState, useRef, useEffect } from 'react';
import { Message, Role, AppView, GroundingChunk } from './types';
import ChatMessage from './components/ChatMessage';
import ThinkingIndicator from './components/ThinkingIndicator';
import LandingPage from './components/LandingPage';
import { 
  generateThoughtfulResponse, 
  generateSearchResponse, 
  generateMapsResponse, 
  generateCoreResponse, 
  generateTTSAudio,
  generateMultiSpeakerTTSAudio
} from './services/geminiService';
import { GoogleGenAI, Modality, LiveServerMessage, GenerateContentResponse } from '@google/genai';

const VOICES = [
  { name: 'Kore', label: 'Balanced', gender: 'FEMALE' },
  { name: 'Puck', label: 'Youthful', gender: 'MALE' },
  { name: 'Charon', label: 'Deep', gender: 'MALE' },
  { name: 'Fenrir', label: 'Bright', gender: 'MALE' },
  { name: 'Zephyr', label: 'Soft', gender: 'NEUTRAL' }
];

const SUGGESTIONS: Record<AppView, string[]> = {
  [AppView.DEEP_THOUGHT]: ["Explain the Monty Hall problem.", "Solve this riddle: I have keys but no locks.", "Analyze AI ethics.", "How do quantum computers work?"],
  [AppView.INSIGHT_STREAM]: ["Space exploration news.", "Quantum computing breakthroughs.", "Global EV market status.", "Sustainable architecture trends."],
  [AppView.MAPS_EXPLORER]: ["Sushi in Tokyo.", "Landmarks in Paris.", "Hiking near Seattle.", "EV charging in SF."],
  [AppView.GEMINI_CORE]: ["Robot discovering feelings story.", "Optimize my code.", "Draft a professional email.", "Summarize an article."],
  [AppView.AUDIO_TRANSCRIPTION]: []
};

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function App() {
  const [isLinked, setIsLinked] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [activeView, setActiveView] = useState<AppView>(AppView.GEMINI_CORE);
  const [messages, setMessages] = useState<Record<AppView, Message[]>>({
    [AppView.DEEP_THOUGHT]: [], [AppView.INSIGHT_STREAM]: [], [AppView.MAPS_EXPLORER]: [], [AppView.GEMINI_CORE]: [], [AppView.AUDIO_TRANSCRIPTION]: []
  });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAnim, setActiveAnim] = useState<AppView | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [transcriptionTab, setTranscriptionTab] = useState<'translate' | 'tts'>('translate');
  
  const [genMode, setGenMode] = useState<'single' | 'multi'>('single');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [speaker1, setSpeaker1] = useState({ name: 'Joe', voice: 'Puck' });
  const [speaker2, setSpeaker2] = useState({ name: 'Jane', voice: 'Kore' });
  const [ttsScript, setTtsScript] = useState('Hello there! I am the Gemini TTS model. I can speak with many different expressive voices, ranging from cheerful and bright to calm and serious. How can I help you today?');
  
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Hindi');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const currentMessages = messages[activeView];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading, activeView, isLinked, sourceText, targetText]);

  const handleLink = (key: string) => {
    setApiKey(key);
    setIsLinked(true);
  };

  const handleLogout = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    stopAudio();
    setApiKey('');
    setIsLinked(false);
  };

  const handleViewChange = (view: AppView) => {
    setActiveAnim(view);
    setActiveView(view);
    setTimeout(() => setActiveAnim(null), 400);
  };

  const resetCurrentView = () => {
    if (activeView === AppView.AUDIO_TRANSCRIPTION && isTranscribing) stopTranscription();
    setMessages(prev => ({ ...prev, [activeView]: [] }));
    setSourceText(''); setTargetText('');
  };

  const stopAudio = () => {
    if (audioSourceRef.current) { audioSourceRef.current.stop(); audioSourceRef.current = null; }
  };

  const playBase64Audio = async (base64: string) => {
    stopAudio();
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    
    const bytes = decode(base64);
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    
    const source = ctx.createBufferSource();
    source.buffer = buffer; 
    source.connect(ctx.destination); 
    source.start();
    audioSourceRef.current = source;
  };

  const speakText = async (text: string, voiceOverride?: string) => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const audioData = await generateTTSAudio(apiKey, text, voiceOverride || selectedVoice);
      if (audioData) await playBase64Audio(audioData);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleSynthesize = async () => {
    if (!ttsScript.trim() || isLoading) return;
    setIsLoading(true);
    try {
      let audioData = (genMode === 'single') 
        ? await generateTTSAudio(apiKey, ttsScript, selectedVoice)
        : await generateMultiSpeakerTTSAudio(apiKey, ttsScript, speaker1.name, speaker1.voice, speaker2.name, speaker2.voice);
      if (audioData) await playBase64Audio(audioData);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey || (process.env.API_KEY as string) });
      const prompt = `Translate this from ${sourceLang} to ${targetLang}. Return ONLY translated text: "${sourceText}"`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setTargetText(response.text || '');
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const startTranscription = async () => {
    if (isTranscribing) return;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey || (process.env.API_KEY as string) });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsTranscribing(true); 
            setIsLoading(false);
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const bytes = new Uint8Array(int16.buffer);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: { data: encode(bytes), mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            source.connect(scriptProcessor); 
            scriptProcessor.connect(audioCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) setSourceText(prev => prev + message.serverContent!.inputTranscription!.text);
            if (message.serverContent?.outputTranscription) setTargetText(prev => prev + message.serverContent!.outputTranscription!.text);
          },
          onclose: () => setIsTranscribing(false),
          onerror: (e) => console.error(e)
        },
        config: { 
          responseModalities: [Modality.AUDIO], 
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
          systemInstruction: `Translate ${sourceLang} to ${targetLang}.` 
        }
      });
      
      liveSessionRef.current = await sessionPromise;
    } catch (err) { console.error(err); setIsLoading(false); }
  };

  const stopTranscription = () => {
    if (liveSessionRef.current) { 
      liveSessionRef.current.close(); 
      liveSessionRef.current = null; 
    }
    setIsTranscribing(false);
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;
    
    const userMessage: Message = { id: Date.now().toString(), role: Role.USER, text: textToSend, timestamp: Date.now() };
    const aiMessageId = (Date.now() + 1).toString();
    const placeholderMessage: Message = { id: aiMessageId, role: Role.MODEL, text: '', timestamp: Date.now() };
    
    setMessages(prev => ({ 
      ...prev, 
      [activeView]: [...prev[activeView], userMessage, placeholderMessage] 
    }));
    
    setInputText(''); 
    setIsLoading(true);
    
    try {
      if (activeView === AppView.DEEP_THOUGHT) {
        await generateThoughtfulResponse(apiKey, [...messages[activeView], userMessage], (t) => setMessages(prev => ({ ...prev, [activeView]: prev[activeView].map(msg => msg.id === aiMessageId ? { ...msg, text: t } : msg) })));
      } else if (activeView === AppView.INSIGHT_STREAM) {
        await generateSearchResponse(apiKey, [...messages[activeView], userMessage], (text, chunks) => setMessages(prev => ({ ...prev, [activeView]: prev[activeView].map(msg => msg.id === aiMessageId ? { ...msg, text, groundingChunks: chunks } : msg) })));
      } else if (activeView === AppView.MAPS_EXPLORER) {
        await generateMapsResponse(apiKey, [...messages[activeView], userMessage], (text, chunks) => setMessages(prev => ({ ...prev, [activeView]: prev[activeView].map(msg => msg.id === aiMessageId ? { ...msg, text, groundingChunks: chunks } : msg) })));
      } else if (activeView === AppView.GEMINI_CORE) {
        await generateCoreResponse(apiKey, [...messages[activeView], userMessage], (t) => setMessages(prev => ({ ...prev, [activeView]: prev[activeView].map(msg => msg.id === aiMessageId ? { ...msg, text: t } : msg) })));
      }
    } catch (error) { 
      console.error(error); 
      setMessages(prev => ({ ...prev, [activeView]: prev[activeView].filter(msg => msg.id !== aiMessageId) }));
    } finally { 
      setIsLoading(false); 
    }
  };

  if (!isLinked) return <LandingPage onStart={handleLink} />;
  const isNexusView = activeView === AppView.GEMINI_CORE || activeView === AppView.AUDIO_TRANSCRIPTION;

  return (
    <div className="flex h-screen bg-black overflow-hidden animate-fade-in text-gray-200 font-sans">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-[320px]' : 'w-24'} bg-[#0a0a0c] border-r border-gray-900 transition-all duration-500 flex flex-col z-20`}>
        <div className="p-8 flex items-center justify-between">
          <div className={`flex items-center space-x-4 ${!isSidebarOpen && 'hidden'}`}>
             {/* Animated Logo Container */}
             <div className="relative group animate-logo-float">
                {/* Aura Pulse behind the logo */}
                <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-lg animate-aura-pulse -z-10"></div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-teal-500 to-indigo-600 animate-gradient-shift rounded-xl flex items-center justify-center shadow-2xl font-black text-2xl text-white border border-white/20 transform-gpu transition-transform hover:scale-110">
                   S
                </div>
             </div>
             <div className="flex flex-col">
               <span className="font-black text-xl tracking-tight text-white leading-none">Sahayak AI</span>
               <span className="text-[9px] text-blue-400 font-mono tracking-widest uppercase mt-1">BY KUNJ</span>
             </div>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-8">
          <div className="space-y-4">
            {isSidebarOpen && <p className="px-4 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-2">Neural Engines</p>}
            {[
              {v: AppView.DEEP_THOUGHT, l: 'Deep Thought', i: 'M13 10V3L4 14h7v7l9-11h-7z', c: 'bg-blue-600', shadow: 'hover:shadow-blue-500/30'},
              {v: AppView.INSIGHT_STREAM, l: 'Insight Stream', i: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', c: 'bg-teal-600', shadow: 'hover:shadow-teal-500/30'},
              {v: AppView.MAPS_EXPLORER, l: 'Nexus Maps', i: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', c: 'bg-indigo-600', shadow: 'hover:shadow-indigo-500/30'}
            ].map(item => (
              <button 
                key={item.v} 
                onClick={() => handleViewChange(item.v)} 
                className={`w-full flex items-center p-4 rounded-2xl transition-all duration-500 ease-out transform-gpu relative overflow-hidden group 
                  ${activeView === item.v 
                    ? `${item.c} text-white shadow-2xl scale-[1.03] -translate-y-1` 
                    : `hover:bg-gray-800/80 text-gray-500 hover:text-gray-200 hover:-translate-y-1.5 hover:scale-[1.03] ${item.shadow} hover:shadow-xl`
                  } 
                  ${activeAnim === item.v ? 'animate-node-pop' : ''}`}
              >
                <svg className="w-6 h-6 flex-shrink-0 transition-transform duration-500 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.i} /></svg>
                {isSidebarOpen && <span className="ml-4 font-bold text-sm tracking-wide">{item.l}</span>}
                {activeView === item.v && <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {isSidebarOpen && <div className="px-4 flex items-center space-x-2 mb-2"><div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div><p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.25em]">Intelligence Nexus</p></div>}
            <button 
              onClick={() => handleViewChange(AppView.GEMINI_CORE)} 
              className={`w-full flex items-center p-4 rounded-2xl transition-all duration-500 ease-out transform-gpu relative overflow-hidden group 
                ${activeView === AppView.GEMINI_CORE 
                  ? 'bg-amber-600 text-white shadow-2xl scale-[1.03] -translate-y-1' 
                  : 'hover:bg-amber-900/10 text-gray-500 hover:text-amber-500/80 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-amber-500/20 hover:shadow-xl'
                } 
                ${activeAnim === AppView.GEMINI_CORE ? 'animate-node-pop' : ''}`}
            >
              <svg className="w-6 h-6 flex-shrink-0 transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.5 9H22L16 14L18.5 21L12 17L5.5 21L8 14L2 9H9.5L12 2Z" /></svg>
              {isSidebarOpen && <span className="ml-4 font-bold text-sm tracking-wide">Gemini Core</span>}
            </button>
            <button 
              onClick={() => handleViewChange(AppView.AUDIO_TRANSCRIPTION)} 
              className={`w-full flex items-center p-4 rounded-2xl transition-all duration-500 ease-out transform-gpu relative overflow-hidden group 
                ${activeView === AppView.AUDIO_TRANSCRIPTION 
                  ? 'bg-amber-700 text-white shadow-2xl scale-[1.03] -translate-y-1' 
                  : 'hover:bg-amber-900/10 text-gray-500 hover:text-amber-500/80 hover:-translate-y-1.5 hover:scale-[1.03] hover:shadow-amber-700/20 hover:shadow-xl'
                } 
                ${activeAnim === AppView.AUDIO_TRANSCRIPTION ? 'animate-node-pop' : ''}`}
            >
              <svg className="w-6 h-6 flex-shrink-0 transition-transform duration-500 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              {isSidebarOpen && <span className="ml-4 font-bold text-sm tracking-wide">Voice Bridge</span>}
            </button>
          </div>
        </nav>

        {/* Sidebar Footer - Logout */}
        <div className="px-4 py-6 border-t border-gray-900/50 mt-auto">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center p-4 rounded-2xl transition-all duration-500 ease-out transform-gpu text-gray-600 hover:text-red-500 hover:bg-red-500/10 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10 group`}
          >
            <svg className="w-6 h-6 flex-shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isSidebarOpen && <span className="ml-4 font-bold text-sm tracking-wide uppercase tracking-[0.1em]">Terminate Link</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#050507]">
        <header className="px-8 py-5 border-b border-gray-800/50 flex items-center justify-between bg-[#0a0a0c]/80 backdrop-blur-md z-10">
          <div className="flex items-center space-x-4">
            {(sourceText || targetText || isTranscribing || currentMessages.length > 0) && (
              <button onClick={resetCurrentView} className={`p-2 rounded-xl transition-all border ${isNexusView ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-blue-500/10 text-blue-500 border-blue-500/30'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
            )}
            <div><h2 className={`text-2xl font-bold ${isNexusView ? 'text-amber-400' : 'text-white'}`}>{activeView.replace('_', ' ').toUpperCase()}</h2><p className="text-xs text-blue-500/70 uppercase tracking-widest font-mono font-bold mt-1">Neural Engine v2.5</p></div>
          </div>
          <div className="flex items-center space-x-6">
            <div className={`flex items-center space-x-3 text-xs border px-4 py-2 rounded-xl font-bold ${isNexusView ? 'bg-amber-950/30 border-amber-800 text-amber-500' : 'bg-gray-900/50 border-gray-800 text-blue-400'}`}><div className={`w-2 h-2 rounded-full ${isNexusView ? 'bg-amber-500' : 'bg-blue-500'}`}></div><span>{activeView.toUpperCase()}</span></div>
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-10">
          {activeView === AppView.AUDIO_TRANSCRIPTION ? (
            <div className="max-w-6xl mx-auto w-full space-y-8 animate-fade-in">
              <div className="flex bg-[#0f0f13] p-1.5 rounded-2xl border border-gray-800 w-fit mx-auto shadow-2xl">
                <button onClick={() => { resetCurrentView(); setTranscriptionTab('translate'); }} className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${transcriptionTab === 'translate' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Neural Translation</button>
                <button onClick={() => { resetCurrentView(); setTranscriptionTab('tts'); }} className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${transcriptionTab === 'tts' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Assistant Voice</button>
              </div>

              {transcriptionTab === 'translate' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-center space-x-6 px-4 mb-4">
                    <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="bg-[#0f0f13] border border-gray-800 rounded-xl px-6 py-3 text-sm text-amber-500 font-bold outline-none hover:border-amber-500 min-w-[140px] text-center shadow-lg appearance-none"><option>English</option><option>Hindi</option><option>Gujarati</option><option>Spanish</option><option>French</option></select>
                    <button onClick={() => { setSourceLang(targetLang); setTargetLang(sourceLang); }} className="p-3 bg-gray-900 rounded-full hover:bg-gray-800 transition-all text-gray-500 hover:text-amber-500 border border-gray-800 shadow-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button>
                    <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="bg-[#0f0f13] border border-gray-800 rounded-xl px-6 py-3 text-sm text-amber-500 font-bold outline-none hover:border-amber-500 min-w-[140px] text-center shadow-lg appearance-none"><option>Hindi</option><option>English</option><option>Gujarati</option><option>Spanish</option><option>French</option></select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                    <div className="bg-[#0a0a0c] border border-gray-800 rounded-[2.5rem] p-8 flex flex-col relative group hover:border-amber-500/20 shadow-2xl transition-all">
                      <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Type to translate..." className="flex-1 bg-transparent border-none outline-none resize-none text-2xl text-white font-medium placeholder-gray-800" />
                      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-800/50">
                        <div className="flex space-x-4">
                          <button onClick={isTranscribing ? stopTranscription : startTranscription} className={`p-4 rounded-2xl transition-all shadow-xl ${isTranscribing ? 'bg-red-500 text-white animate-pulse shadow-red-500/20' : 'bg-[#111115] text-gray-500 hover:text-amber-500 border border-gray-800'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                          <button onClick={() => speakText(sourceText)} className="p-4 rounded-2xl bg-[#111115] text-gray-500 hover:text-amber-500 border border-gray-800 transition-all shadow-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
                        </div>
                        <button onClick={handleTranslate} disabled={isLoading || !sourceText.trim()} className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-xl shadow-amber-900/20">Synthesize Translation</button>
                      </div>
                    </div>
                    <div className="bg-[#0f0f13] border border-gray-800 rounded-[2.5rem] p-8 flex flex-col relative hover:border-blue-500/20 shadow-2xl transition-all">
                      <div className="flex-1 overflow-y-auto pr-2"><p className={`text-2xl font-bold leading-relaxed ${targetText ? 'text-blue-400' : 'text-gray-800 italic'}`}>{targetText || "Translation will materialize here..."}</p></div>
                      <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-800/50">
                        <div className="flex space-x-4">
                           <button onClick={() => navigator.clipboard.writeText(targetText)} className="p-4 rounded-2xl bg-[#1a1a20] text-gray-500 hover:text-blue-400 border border-gray-800 shadow-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg></button>
                           <button onClick={() => speakText(targetText)} className="p-4 rounded-2xl bg-[#1a1a20] text-gray-500 hover:text-blue-400 border border-gray-800 shadow-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
                        </div>
                        {isLoading && <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 animate-fade-in max-w-6xl mx-auto h-[600px]">
                  <div className="bg-[#0a0a0c] border border-gray-800 rounded-[2.5rem] p-8 flex flex-col space-y-8 shadow-2xl overflow-y-auto">
                    <div className="flex items-center space-x-3 text-blue-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg><h3 className="font-black text-xs uppercase tracking-widest">Voice Settings</h3></div>
                    <div className="space-y-4"><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Generation Mode</p><div className="flex bg-black/50 p-1 rounded-2xl border border-gray-800/50 shadow-inner"><button onClick={() => { setGenMode('single'); setTtsScript('Hello! I am the Gemini TTS model...'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genMode === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Single Speaker</button><button onClick={() => { setGenMode('multi'); setTtsScript('Joe: Hi Jane!\nJane: Hello Joe, how are you?'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${genMode === 'multi' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Multi-Speaker</button></div></div>
                    {genMode === 'single' ? (
                      <div className="space-y-4"><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Select Voice</p><div className="space-y-2">{VOICES.map(v => (<button key={v.name} onClick={() => setSelectedVoice(v.name)} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedVoice === v.name ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg' : 'bg-transparent border-gray-800 text-gray-400 hover:border-gray-700'}`}><span className="font-bold text-sm">{v.name} ({v.label})</span><span className="text-[8px] font-black bg-black/50 px-2 py-1 rounded text-gray-500 border border-gray-800 uppercase">{v.gender}</span></button>))}</div></div>
                    ) : (
                      <div className="space-y-6"><p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Configure Speakers</p><div className="space-y-4 shadow-2xl">
                        <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-2xl space-y-3"><input value={speaker1.name} onChange={e => setSpeaker1(prev => ({ ...prev, name: e.target.value }))} className="bg-transparent border-b border-gray-800 w-full outline-none text-sm font-bold text-blue-400 focus:border-blue-500 py-1" /><select value={speaker1.voice} onChange={e => setSpeaker1(prev => ({ ...prev, voice: e.target.value }))} className="bg-black border border-gray-800 w-full rounded-lg text-xs py-2 px-3 outline-none focus:border-blue-500">{VOICES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}</select></div>
                        <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-2xl space-y-3"><input value={speaker2.name} onChange={e => setSpeaker2(prev => ({ ...prev, name: e.target.value }))} className="bg-transparent border-b border-gray-800 w-full outline-none text-sm font-bold text-teal-400 focus:border-teal-500 py-1" /><select value={speaker2.voice} onChange={e => setSpeaker2(prev => ({ ...prev, voice: e.target.value }))} className="bg-black border border-gray-800 w-full rounded-lg text-xs py-2 px-3 outline-none focus:border-blue-500">{VOICES.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}</select></div>
                      </div></div>
                    )}
                  </div>
                  <div className="bg-[#0a0a0c] border border-gray-800 rounded-[2.5rem] p-10 flex flex-col space-y-8 shadow-2xl relative">
                    <div className="flex items-center space-x-3 text-teal-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg><h3 className="font-black text-xs uppercase tracking-widest">Script Editor</h3></div>
                    <textarea value={ttsScript} onChange={e => setTtsScript(e.target.value)} className="flex-1 bg-black/30 border border-gray-800 rounded-[2rem] p-8 outline-none text-xl text-gray-300 font-medium leading-relaxed resize-none focus:border-blue-500/30 shadow-inner" />
                    <div className="h-24 bg-black/40 border border-gray-800 rounded-3xl flex items-center justify-center space-x-1 px-8 overflow-hidden relative shadow-inner">
                      {isLoading ? <span className="text-[10px] font-black uppercase tracking-widest text-gray-700 animate-pulse">Neural Encoding...</span> : <div className="flex items-center space-x-1.5 opacity-40">{Array.from({ length: 40 }).map((_, i) => (<div key={i} className="w-1 bg-blue-500/50 rounded-full" style={{ height: `${Math.random() * 60 + 10}%` }}></div>))}</div>}
                    </div>
                    <div className="flex space-x-4"><button onClick={handleSynthesize} disabled={isLoading || !ttsScript.trim()} className="flex-1 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:opacity-50 text-white font-black py-6 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-sm flex items-center justify-center space-x-4">{isLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg><span>Synthesize Audio</span></>}</button><button onClick={stopAudio} className="w-24 bg-red-950/20 hover:bg-red-500/20 text-red-500 border border-red-900/30 py-6 rounded-3xl transition-all flex items-center justify-center shadow-xl"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg></button></div>
                  </div>
                </div>
              )}
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-10 max-w-3xl mx-auto py-20 animate-fade-in">
              <div className="space-y-6">
                <div className={`w-28 h-28 mx-auto rounded-[2.5rem] flex items-center justify-center border-2 transition-all duration-700 ${activeView === AppView.GEMINI_CORE ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.2)] text-blue-500' : 'bg-teal-600/10 border-teal-500 shadow-[0_0_40px_rgba(20,184,166,0.2)] text-teal-500'}`}>
                   <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.5 9H22L16 14L18.5 21L12 17L5.5 21L8 14L2 9H9.5L12 2Z"/></svg>
                </div>
                <h3 className="text-6xl font-black text-white tracking-tighter">Initialize {activeView.replace('_', ' ').toUpperCase()}?</h3>
                <p className="text-gray-500 text-xl font-medium leading-relaxed max-w-2xl mx-auto">Accessing neural link for advanced reasoning and task execution.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {SUGGESTIONS[activeView].map((s, idx) => (<button key={idx} onClick={() => handleSendMessage(undefined, s)} className={`text-left p-6 rounded-[2.2rem] border bg-[#0a0a0c] transition-all group border-gray-800 hover:border-blue-500 hover:bg-blue-500/5 shadow-2xl active:scale-[0.98]`}><p className="text-sm font-bold text-gray-500 group-hover:text-blue-200 transition-colors">{s}</p></button>))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full animate-fade-in">
              {currentMessages.map(msg => <ChatMessage key={msg.id} message={msg} isThinkingMode={activeView === AppView.DEEP_THOUGHT} />)}
              {isLoading && <div className={`font-mono text-[10px] animate-pulse tracking-[0.4em] font-black ml-12 ${isNexusView ? 'text-amber-400' : 'text-blue-400'}`}>ESTABLISHING_NEURAL_LINK...</div>}
            </div>
          )}
        </main>

        <footer className={`p-8 bg-[#0a0a0c]/80 backdrop-blur-xl border-t border-gray-800/50 transition-all ${activeView === AppView.AUDIO_TRANSCRIPTION ? 'hidden' : 'opacity-100'}`}>
          <div className="max-w-4xl mx-auto relative group">
            <form onSubmit={handleSendMessage}>
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Submit query to neural link..." className="w-full bg-[#050507] border border-gray-800 rounded-[2.5rem] px-10 py-7 pr-24 focus:outline-none focus:border-blue-500/50 transition-all resize-none min-h-[95px] max-h-[350px] text-white text-lg font-medium shadow-2xl" rows={1} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
              <button type="submit" disabled={isLoading || !inputText.trim()} className={`absolute right-5 bottom-5 p-5 rounded-3xl disabled:opacity-50 transition-all shadow-2xl ${activeView === AppView.GEMINI_CORE ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                {isLoading ? <svg className="w-7 h-7 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
              </button>
            </form>
          </div>
          <div className="mt-5 text-center text-[10px] text-gray-700 font-mono tracking-[0.5em] uppercase font-black">Sahayak Neural Engine • Protocol 2.5 • Verified Link</div>
        </footer>
      </div>
    </div>
  );
}

export default App;
