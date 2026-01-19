
import React from 'react';

const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex flex-col space-y-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl animate-pulse">
      <div className="flex items-center space-x-3 text-blue-400">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm font-medium tracking-wide uppercase">Reasoning in progress...</span>
      </div>
      <div className="space-y-2">
        <div className="h-2 bg-blue-500/20 rounded w-full"></div>
        <div className="h-2 bg-blue-500/20 rounded w-5/6"></div>
        <div className="h-2 bg-blue-500/20 rounded w-4/6"></div>
      </div>
      <p className="text-xs text-blue-300/60 italic">
        Gemini is utilizing its full thinking budget (32,768 tokens) to process your request.
      </p>
    </div>
  );
};

export default ThinkingIndicator;
