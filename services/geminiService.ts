
import { GoogleGenAI, Schema, Type, Modality } from "@google/genai";
import { BookSummary, Quote, VocabItem, QuizQuestion, ActionDay, ReaderSegment, BookReview, ReviewStyle, ComplexityLevel, PodcastResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-2.5-flash';
const ttsModelName = 'gemini-2.5-flash-preview-tts';
// Fallback to 2.0-flash-exp as 2.5-preview might be unavailable in some regions/tiers
const liveModelName = 'gemini-2.0-flash-exp';

// Global cache for TTS to improve performance
const speechCache = new Map<string, ArrayBuffer>();

// --- Helper for Rate Limiting (Exponential Backoff) ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateContentWithRetry = async (model: string, params: any, retries = 5, backoff = 5000): Promise<any> => {
  try {
    return await ai.models.generateContent({
      model: model,
      ...params
    });
  } catch (e: any) {
    const errorStr = e.toString().toLowerCase();
    const isRateLimit = e.status === 429 || 
                        errorStr.includes('429') || 
                        errorStr.includes('resource_exhausted') || 
                        errorStr.includes('quota') ||
                        errorStr.includes('limit');

    if (retries > 0 && isRateLimit) {
       console.warn(`Rate limit hit for ${model}. Retrying in ${backoff}ms... (Attempts left: ${retries})`);
       await delay(backoff);
       return generateContentWithRetry(model, params, retries - 1, backoff * 1.5); // Increase backoff by 1.5x each time
    }
    throw e;
  }
};

// --- Complexity Helper ---
const getSystemInstruction = (complexity: ComplexityLevel, role: string) => {
    if (complexity === 'KIDS') {
        return `You are a friendly, energetic kindergarten teacher. ${role}. 
        IMPORTANT: Explain everything as if the user is a 5-year-old child. 
        Use simple words, metaphors, emojis (🌟, 🚀, 📚), and an encouraging tone. 
        Avoid complex jargon. Turn abstract concepts into stories.`;
    }
    return `You are an expert literary analyst. ${role}. Output in Chinese.`;
};

// --- Schemas ---

const summarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    author: { type: Type.STRING },
    overallSummary: { type: Type.STRING },
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          chapterTitle: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ["chapterTitle", "summary"]
      }
    }
  },
  required: ["title", "overallSummary", "chapters"]
};

const quotesSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING },
      translation: { type: Type.STRING },
      source: { type: Type.STRING },
      reason: { type: Type.STRING }
    },
    required: ["text", "translation", "reason"]
  }
};

const vocabSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      ipa: { type: Type.STRING, description: "Standard IPA pronunciation" },
      pos: { type: Type.STRING, description: "Part of speech (e.g., n., v., adj.)" },
      meaning: { type: Type.STRING, description: "Simple, concise Chinese definition" },
      sentence: { type: Type.STRING, description: "A SHORT, SIMPLE example sentence in ENGLISH using this word." }
    },
    required: ["word", "ipa", "pos", "meaning", "sentence"]
  }
};

const quizSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      questionCn: { type: Type.STRING, description: "Question in Chinese" },
      questionEn: { type: Type.STRING, description: "Question in English" },
      optionsCn: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options in Chinese" },
      optionsEn: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options in English" },
      correctAnswerIndex: { type: Type.INTEGER },
      explanationCn: { type: Type.STRING, description: "Explanation in Chinese" },
      explanationEn: { type: Type.STRING, description: "Explanation in English" }
    },
    required: ["questionCn", "questionEn", "optionsCn", "optionsEn", "correctAnswerIndex", "explanationCn", "explanationEn"]
  }
};

const planSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: { type: Type.INTEGER },
      focus: { type: Type.STRING },
      tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["day", "focus", "tasks"]
  }
};

const readerSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      original: { type: Type.STRING },
      translation: { type: Type.STRING },
    },
    required: ["original", "translation"]
  }
};

const reviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    titles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 candidate titles" },
    oneSentenceSummary: { type: Type.STRING, description: "Max 30 chars summary" },
    contentMarkdown: { type: Type.STRING, description: "The full review content in Markdown" },
    selfCheckList: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Self-check items" },
  },
  required: ["titles", "oneSentenceSummary", "contentMarkdown", "selfCheckList"]
};

const podcastSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        script: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    speaker: { type: Type.STRING, description: "Must be 'Host' or 'Expert'" },
                    text: { type: Type.STRING }
                },
                required: ["speaker", "text"]
            }
        }
    },
    required: ["title", "script"]
};

// --- Helper Functions ---

export const createWavBlob = (audioBuffer: ArrayBuffer, sampleRate: number = 24000): Blob => {
  const numOfChannels = 1;
  const length = audioBuffer.byteLength;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  
  // Helper to write string
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numOfChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, length, true);
  
  // write the PCM samples
  const pcmData = new Uint8Array(audioBuffer);
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
};


// --- API Calls ---

export const generateSummary = async (text: string, complexity: ComplexityLevel = 'NORMAL'): Promise<BookSummary> => {
  const prompt = `Analyze the following book content. Provide a title, author (if found), an overall summary, and chapter-by-chapter summaries. 
  IMPORTANT: The output must be in Chinese.
  ${complexity === 'KIDS' ? "Explain the plot like a fairytale or a simple story for children." : ""}
  Text: ${text.substring(0, 30000)}...`; 

  const response = await generateContentWithRetry(modelName, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: summarySchema,
      systemInstruction: getSystemInstruction(complexity, "Summarize this book"),
    }
  });

  return JSON.parse(response.text) as BookSummary;
};

export const generateQuotes = async (text: string, existingQuotes: Quote[] = [], complexity: ComplexityLevel = 'NORMAL'): Promise<Quote[]> => {
  const existingText = existingQuotes.map(q => q.text).join(" | ");
  
  const prompt = `Extract 5 Golden Sentences.
  ${complexity === 'KIDS' 
    ? "Find sentences that teach a simple moral lesson. Translate them into simple Chinese that a child understands." 
    : "Find the most profound, philosophically significant sentences."}

  OUTPUT FORMAT:
  1. 'text': The original quote.
  2. 'translation': ${complexity === 'KIDS' ? "A fun, simple translation with emojis." : "A PRECISE, LITERARY Chinese translation."}
  3. 'reason': ${complexity === 'KIDS' ? "Why this is a good lesson for a kid." : "Deep analysis."}
  
  ${existingText ? `Exclude: ${existingText}` : ''}
  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await generateContentWithRetry(modelName, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: quotesSchema,
      systemInstruction: getSystemInstruction(complexity, "Extract quotes"),
    }
  });

  return JSON.parse(response.text) as Quote[];
};

export const generateVocab = async (text: string, existingWords: VocabItem[] = [], complexity: ComplexityLevel = 'NORMAL'): Promise<VocabItem[]> => {
  const existingList = existingWords.map(w => w.word).join(", ");
  
  const prompt = `Identify exactly 10 core vocabulary words from the text.
  
  Requirements:
  1. Count: Exactly 10 words.
  2. IPA: Provide accurate, standard International Phonetic Alphabet (e.g., /wɜːrd/).
  3. Pos: Provide standard abbreviation (n., v., adj., etc.).
  4. Meaning: Simple, concise, clear Chinese definition (max 10-15 characters). avoid lengthy explanations.
  5. Sentence: A SHORT, SIMPLE example sentence in **ENGLISH** (max 15 words) containing the word. Do NOT translate the sentence to Chinese.
  
  ${existingList ? `CRITICAL: Do NOT include these words: ${existingList}` : ''}

  ${complexity === 'KIDS'
    ? "Selection Criteria: Choose words suitable for children."
    : "Selection Criteria: Choose core keywords or advanced words."}
  
  Text snippet: ${text.substring(0, 25000)}...`;

  const response = await generateContentWithRetry(modelName, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: vocabSchema,
      temperature: 0.9, // Increase temperature for variety
      systemInstruction: getSystemInstruction(complexity, "Vocabulary builder"),
    }
  });

  return JSON.parse(response.text) as VocabItem[];
};

export const generateQuiz = async (text: string, existingQuestions: QuizQuestion[] = [], complexity: ComplexityLevel = 'NORMAL'): Promise<QuizQuestion[]> => {
  const prompt = `Create 5 multiple choice questions.
  ${complexity === 'KIDS'
    ? "Ask simple questions about what happened in the story. Use fun options."
    : "Ask deep inference and critical thinking questions."}

  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await generateContentWithRetry(modelName, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: quizSchema,
      temperature: 0.9,
      systemInstruction: getSystemInstruction(complexity, "Quiz master"),
    }
  });

  return JSON.parse(response.text) as QuizQuestion[];
};

export const generateActionPlan = async (text: string, complexity: ComplexityLevel = 'NORMAL'): Promise<ActionDay[]> => {
  const prompt = `Create a 7-day action plan.
  ${complexity === 'KIDS'
     ? "Create a 'Little Hero Challenge'. 7 days of fun, simple activities a kid can do (e.g., 'Draw a picture', 'Help a friend')."
     : "Create a serious learning and application plan."}
  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await generateContentWithRetry(modelName, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: planSchema,
      systemInstruction: getSystemInstruction(complexity, "Life coach"),
    }
  });

  return JSON.parse(response.text) as ActionDay[];
};

export const generateReaderContent = async (text: string, focusChapter?: string, complexity: ComplexityLevel = 'NORMAL'): Promise<ReaderSegment[]> => {
  const prompt = `
  Analyze the text. ${focusChapter ? `Focus on: ${focusChapter}` : ""}
  Break it into logical reading segments.
  
  TRANSLATION RULE (Bi-directional):
  1. If the 'original' text is primarily Chinese -> Translate it into English.
  2. If the 'original' text is primarily English (or other) -> Translate it into Chinese.
  
  ${complexity === 'KIDS' 
    ? "For Kids Mode: Keep the translation simple, fun, and easy to read. If translating to English, use simple vocabulary." 
    : "For Normal Mode: Ensure the translation is accurate, literary, and fluent."}
  
  Text: ${text.substring(0, 20000)}...`; 

  const response = await generateContentWithRetry(modelName, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: readerSchema,
      systemInstruction: getSystemInstruction(complexity, "Translator"),
    }
  });

  return JSON.parse(response.text) as ReaderSegment[];
}

export const generateReview = async (text: string, style: ReviewStyle, language: 'CN' | 'EN'): Promise<BookReview> => {
  // Determine specific prompts based on style
  let styleInstruction = `Style: ${style}.`;
  
  if (style === 'LUXUN') {
      styleInstruction = `Role: You are Lu Xun (鲁迅).
      Task: Write a biting, socially critical book review using semi-classical vernacular (半文半白) style typical of Lu Xun's essays (杂文).
      - Tone: Cynical, sharp, observing the "cannibalism" (吃人) or numbness of society, but holding a torch for the future.
      - Use metaphors like "iron house", "passers-by".
      - Critique the book's value to the current era and human nature.
      - 'titles': Must be in Lu Xun's essay title style (e.g., "热风", "而已集" style).
      - 'oneSentenceSummary': A sharp, memorable aphorism.`;
  } else if (style === 'GENTLE') {
      styleInstruction = `Role: Objective Critic.
      Task: Write a NEUTRAL, OBJECTIVE, and BALANCED summary and review. 
      - Tone: Professional, calm, unbiased. Focus on facts, main arguments, and structure.
      - Avoid excessive praise or harsh criticism.`;
  } else if (style === 'LIBAI') {
      styleInstruction = `Role: You are the poet Li Bai (李白). 
      Task: Write a *short* book review in the form of Classical Chinese Poetry (古诗).
      - Constraint: The poem must be concise, strictly under 10 lines.
      - The 'titles' should be poetic 5 or 7-character phrases.
      - The 'oneSentenceSummary' should be a poetic couplet (对联).
      - The 'contentMarkdown' must be the poem itself. Express bold, romantic, and unconstrained emotions. Use imagery of wine, moon, and swords.`;
  } else if (style === 'MARKTWAIN') {
      styleInstruction = `Role: You are Mark Twain.
      Task: Write a book review full of biting humor, satire, and dry wit.
      - Tone: Conversational, slightly cynical, observant, and funny.
      - Poke fun at the author's quirks or the book's logic, but still deliver a genuine verdict.
      - 'titles': Witty and satirical.
      - 'oneSentenceSummary': A humorous punchline.`;
  }

  const prompt = `Write a book review. ${styleInstruction} Language: ${language}.
  Text: ${text.substring(0, 40000)}...`;

  const response = await generateContentWithRetry("gemini-2.5-flash", {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: reviewSchema,
      temperature: style === 'LUXUN' || style === 'LIBAI' ? 0.95 : 0.7, // Higher temp for creative personas
    }
  });

  return JSON.parse(response.text) as BookReview;
};

// --- PODCAST GENERATION (New Feature) ---

export const generatePodcast = async (text: string, complexity: ComplexityLevel = 'NORMAL', language: 'CN' | 'EN' = 'EN'): Promise<PodcastResult> => {
    // Dynamic duration based on text length
    const textLen = text.length;
    let durationHint = "2-3 minutes";
    if (textLen > 15000) {
        durationHint = "7-9 minutes";
    } else if (textLen > 8000) {
        durationHint = "5-7 minutes";
    } else if (textLen > 3000) {
        durationHint = "3-5 minutes";
    }

    // 1. Generate Script
    const scriptPrompt = `
    Create a ${durationHint} podcast script discussing this book.
    Characters:
    - Host: Enthusiastic, asks questions.
    - Expert: Knowledgeable, answers with insights.
    
    Target Audience: ${complexity === 'KIDS' ? "Young Children (5-8 years old)" : "Adults"}.
    Style: ${complexity === 'KIDS' 
        ? "EXTREMELY SIMPLE. Short sentences. Fun and concise. Clear for kids. Use sound effects in brackets." 
        : "Concise, clear, and easy to follow. Avoid complex jargon. Engaging conversation."}
    
    IMPORTANT: The script must be in ${language === 'CN' ? 'CHINESE (Mandarin)' : 'ENGLISH'}.
    
    Output JSON with 'title' and 'script' array.
    Text: ${text.substring(0, 50000)}...
    `;

    const scriptResponse = await generateContentWithRetry(modelName, {
        contents: scriptPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: podcastSchema,
        }
    });

    const result = JSON.parse(scriptResponse.text) as PodcastResult;
    
    // 2. Generate Audio (Multi-speaker)
    // We construct the prompt for TTS model to act out the script
    // Explicitly instruction "TTS the following conversation" to prevent the model from generating new content
    const conversationText = `TTS the following conversation between Host and Expert:
${result.script.map(line => `${line.speaker}: ${line.text}`).join('\n')}`;
    
    try {
        const audioResponse = await ai.models.generateContent({
            model: ttsModelName,
            contents: [{ parts: [{ text: conversationText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            {
                                speaker: 'Host',
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: complexity === 'KIDS' ? 'Puck' : 'Kore' } }
                            },
                            {
                                speaker: 'Expert',
                                voiceConfig: { prebuiltVoiceConfig: { voiceName: complexity === 'KIDS' ? 'Fenrir' : 'Charon' } } // Fenrir/Puck are distinct
                            }
                        ]
                    }
                }
            }
        });

        const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            result.audioBuffer = bytes.buffer;
        }
    } catch (e) {
        console.error("Podcast Audio Generation Failed", e);
        // We still return the script even if audio fails
    }

    return result;
};


// --- Text To Speech (Single) ---

export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
  if (!text || !text.trim()) return null;
  if (speechCache.has(text)) return speechCache.get(text)!.slice(0);

  try {
    const response = await generateContentWithRetry(ttsModelName, {
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = bytes.buffer;
      speechCache.set(text, buffer.slice(0));
      return buffer;
    }
    return null;
  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
};

export const decodePCM = (ctx: AudioContext, arrayBuffer: ArrayBuffer, sampleRate: number = 24000): AudioBuffer => {
  const pcmData = new Int16Array(arrayBuffer);
  const buffer = ctx.createBuffer(1, pcmData.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < pcmData.length; i++) {
    channelData[i] = pcmData[i] / 32768.0;
  }
  return buffer;
};

// Streaming Chat
export const createChatSession = (systemInstruction: string) => {
  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: systemInstruction + " Answer in Chinese. Do NOT wrap your answer in quotes.",
    }
  });
};

// --- Live API Helper ---
// Correctly separating callbacks from the config object
export const createLiveSession = (systemInstruction: string, options: { callbacks?: any, config?: any } = {}) => {
  return ai.live.connect({
      model: liveModelName,
      config: {
          systemInstruction: systemInstruction,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          ...options.config
      },
      callbacks: options.callbacks
  });
}
