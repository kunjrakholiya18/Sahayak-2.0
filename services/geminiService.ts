
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Message, Role, GroundingChunk } from "../types";

const getLatLong = (): Promise<{ latitude: number, longitude: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
};

export const generateThoughtfulResponse = async (
  apiKey: string,
  history: Message[],
  onChunk: (text: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || (process.env.API_KEY as string) });
  
  const contents = history.map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768,
        },
      },
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      const chunkText = (chunk as GenerateContentResponse).text || '';
      fullText += chunkText;
      onChunk(fullText);
    }

    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateSearchResponse = async (
  apiKey: string,
  history: Message[],
  onComplete: (text: string, chunks?: GroundingChunk[]) => void
): Promise<void> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || (process.env.API_KEY as string) });
  
  const contents = history.map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[];
    onComplete(text, chunks);
  } catch (error) {
    console.error("Search API Error:", error);
    throw error;
  }
};

export const generateMapsResponse = async (
  apiKey: string,
  history: Message[],
  onComplete: (text: string, chunks?: GroundingChunk[]) => void
): Promise<void> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || (process.env.API_KEY as string) });
  const location = await getLatLong();
  
  const contents = history.map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  try {
    const config: any = {
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
    };

    if (location) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: config,
    });

    const text = response.text || '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[];
    onComplete(text, chunks);
  } catch (error) {
    console.error("Maps API Error:", error);
    throw error;
  }
};

export const generateCoreResponse = async (
  apiKey: string,
  history: Message[],
  onChunk: (text: string) => void
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || (process.env.API_KEY as string) });
  
  const contents = history.map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: "You are the Gemini Intel Core of Sahayak AI. You are highly versatile, capable of analyzing content, making creative edits, and assisting with any general tasks with high intelligence and efficiency.",
      },
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      const chunkText = (chunk as GenerateContentResponse).text || '';
      fullText += chunkText;
      onChunk(fullText);
    }

    return fullText;
  } catch (error) {
    console.error("Gemini Core Error:", error);
    throw error;
  }
};

export const generateTTSAudio = async (apiKey: string, text: string, voice: string = 'Kore'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || (process.env.API_KEY as string) });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};

export const generateMultiSpeakerTTSAudio = async (
  apiKey: string,
  text: string, 
  speaker1Name: string, 
  speaker1Voice: string, 
  speaker2Name: string, 
  speaker2Voice: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || (process.env.API_KEY as string) });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `TTS the following conversation between ${speaker1Name} and ${speaker2Name}:\n${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: speaker1Name,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker1Voice } }
              },
              {
                speaker: speaker2Name,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker2Voice } }
              }
            ]
          }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
  } catch (error) {
    console.error("Multi-Speaker TTS Error:", error);
    throw error;
  }
};
