
import React from 'react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
  isThinkingMode?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isThinkingMode }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 ${
        isUser 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'bg-gray-800/50 border border-gray-700 text-gray-100'
      }`}>
        <div className="flex items-center mb-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isUser ? 'text-blue-100' : 'text-blue-400'}`}>
            {isUser ? 'Sahayak User' : isThinkingMode ? 'Deep Thought Sahayak' : 'Insight Sahayak'}
          </span>
          {!isUser && isThinkingMode && (
             <div className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-300 font-mono">
                THINKING_MODE
             </div>
          )}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
          {message.text}
        </div>
        
        {message.groundingChunks && message.groundingChunks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Sources & Intelligence:
            </p>
            <div className="flex flex-wrap gap-2">
              {message.groundingChunks.map((chunk, i) => {
                const isMap = !!chunk.maps;
                const uri = chunk.maps?.uri || chunk.web?.uri;
                const title = chunk.maps?.title || chunk.web?.title || uri;
                
                if (!uri) return null;

                return (
                  <a 
                    key={i} 
                    href={uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`text-[11px] bg-gray-900/50 border px-2 py-1 rounded transition-colors truncate max-w-[200px] flex items-center space-x-1.5 ${
                      isMap 
                        ? 'text-green-400 border-green-900/50 hover:bg-green-900/20 hover:border-green-500/50' 
                        : 'text-blue-300 border-gray-700 hover:bg-blue-900/30 hover:border-blue-500/50'
                    }`}
                  >
                    {isMap && (
                      <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    )}
                    <span>{title}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div className={`mt-2 text-[10px] ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
