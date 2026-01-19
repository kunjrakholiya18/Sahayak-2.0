
import React, { useState } from 'react';

interface LandingPageProps {
  onStart: (apiKey: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [keyInput, setKeyInput] = useState('');

  const handleStart = () => {
    if (keyInput.trim()) {
      onStart(keyInput);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[100] p-6 text-center animate-fade-in font-sans overflow-hidden">
      {/* Robot Avatar - Screenshot Replication */}
      <div className="relative mb-14">
        {/* Antennae Dots */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex space-x-16 z-20">
          <div className="w-3 h-3 bg-[#42f2ff] rounded-full shadow-[0_0_20px_#42f2ff]"></div>
          <div className="w-3 h-3 bg-[#42f2ff] rounded-full shadow-[0_0_20px_#42f2ff]"></div>
        </div>
        
        {/* Head Shell */}
        <div className="w-64 h-56 bg-gradient-to-b from-[#3169f4] to-[#1c3aaf] rounded-[4rem] relative flex items-center justify-center shadow-[0_25px_60px_rgba(0,0,0,0.6)] border-b-[12px] border-[#1a365d]">
           {/* Face Screen */}
           <div className="w-[88%] h-[80%] bg-[#0a0a0f] rounded-[3.2rem] flex flex-col items-center justify-center space-y-7 border border-white/5">
              <div className="flex space-x-14">
                <div className="w-8 h-8 bg-[#42f2ff] rounded-full shadow-[0_0_25px_#42f2ff] animate-pulse"></div>
                <div className="w-8 h-8 bg-[#42f2ff] rounded-full shadow-[0_0_25px_#42f2ff] animate-pulse"></div>
              </div>
              {/* Mouth line */}
              <div className="w-16 h-[3px] bg-[#42f2ff] opacity-40 rounded-full"></div>
           </div>
           
           {/* Side Glow Effect */}
           <div className="absolute -right-2 top-1/4 w-8 h-20 bg-purple-600/20 blur-2xl rounded-full"></div>
        </div>
      </div>

      {/* Main Brand Title */}
      <div className="space-y-4 mb-14">
        <h1 className="text-8xl font-black tracking-tight text-[#70d2ff] drop-shadow-[0_0_30px_rgba(112,210,255,0.3)]">
          Sahayak 2.0
        </h1>
        <p className="text-[12px] uppercase tracking-[0.55em] text-gray-500 font-extrabold">
          A NEURAL CREATION • BY KUNJ
        </p>
      </div>

      {/* Greeting */}
      <div className="space-y-4 mb-12">
        <h2 className="text-3xl font-bold text-white tracking-tight">Welcome, User!</h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
          To enable high-quality voice and bilingual chat, Sahayak needs a Paid API Key.
        </p>
      </div>

      {/* Action Section */}
      <div className="w-full max-w-md space-y-10">
        <div className="space-y-4 text-left">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">
            FOR VERIFICATION REENTER YOUR GEMINI API KEY
          </label>
          <div className="relative group">
            <input 
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste key here..."
              className="w-full bg-[#0a0a0f] border border-gray-800 rounded-3xl px-8 py-5 text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all shadow-inner group-hover:border-gray-700"
            />
            <div className="absolute inset-0 rounded-3xl bg-blue-500/5 blur-xl -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Establish Link Button */}
        <button 
          onClick={handleStart}
          disabled={!keyInput.trim()}
          className="w-full bg-gradient-to-r from-[#14b8a6] to-[#2563eb] hover:from-[#0d9488] hover:to-[#1d4ed8] active:scale-[0.98] disabled:opacity-30 disabled:grayscale text-white font-black py-6 rounded-[2rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] transition-all uppercase tracking-[0.3em] text-sm flex items-center justify-center space-x-4 group"
        >
          <span className="group-hover:translate-x-1 transition-transform">Establish Link</span>
          <span className="text-yellow-400 text-xl drop-shadow-sm">✨</span>
        </button>

        {/* Change Profile Link */}
        <button className="text-[10px] font-bold text-gray-700 uppercase tracking-[0.3em] hover:text-gray-500 transition-colors block mx-auto py-2">
          CHANGE NAME
        </button>
      </div>

      {/* Footer Details */}
      <div className="mt-20 pt-10 border-t border-white/5 w-80">
        <div className="text-[10px] text-gray-800 font-bold tracking-[0.6em] uppercase text-center leading-relaxed">
          SAHAYAK • CREATED BY KUNJ • BILINGUAL INTELLIGENCE
        </div>
      </div>

      {/* Ambiance Gradients */}
      <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-900/5 rounded-full blur-[150px] -z-10"></div>
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-teal-900/5 rounded-full blur-[150px] -z-10"></div>
    </div>
  );
};

export default LandingPage;
