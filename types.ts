
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum AppView {
  DEEP_THOUGHT = 'deep_thought',
  INSIGHT_STREAM = 'insight_stream',
  MAPS_EXPLORER = 'maps_explorer',
  GEMINI_CORE = 'gemini_core',
  AUDIO_TRANSCRIPTION = 'audio_transcription'
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title?: string;
  };
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  groundingChunks?: GroundingChunk[];
}

export interface ThinkingState {
  isActive: boolean;
  status: string;
}
