
import { GoogleGenAI, Schema, Type, Modality } from "@google/genai";
import { BookSummary, Quote, VocabItem, QuizQuestion, ActionDay, ReaderSegment, BookReview, ReviewStyle } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-2.5-flash';
const ttsModelName = 'gemini-2.5-flash-preview-tts';

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
      ipa: { type: Type.STRING },
      pos: { type: Type.STRING },
      meaning: { type: Type.STRING }
    },
    required: ["word", "ipa", "pos", "meaning"]
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

// --- API Calls ---

export const generateSummary = async (text: string): Promise<BookSummary> => {
  const prompt = `Analyze the following book content. Provide a title, author (if found), an overall summary, and chapter-by-chapter summaries. 
  IMPORTANT: The output must be in Chinese. If the book is in English, translate the summaries to Chinese.
  Text: ${text.substring(0, 30000)}...`; 

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: summarySchema,
      systemInstruction: "You are an expert literary analyst. Output in Chinese.",
    }
  });

  return JSON.parse(response.text) as BookSummary;
};

export const generateMindMap = async (text: string, detailed: boolean = false): Promise<string> => {
  const complexityInstruction = detailed 
    ? "Create a DETAILED hierarchical mind map. Use at least 3 levels of depth. Break down chapters into concepts, and concepts into key details." 
    : "Create a high-level overview mind map.";

  // Critical fix for Mermaid: Enforce quoting labels to prevent syntax errors with special chars
  const prompt = `Create a Mermaid.js diagram code for a mind map of this book. 
  ${complexityInstruction}
  
  RULES FOR MERMAID SYNTAX:
  1. Start with 'graph LR'.
  2. You MUST wrap ALL node label texts in double quotes. Example: A["Book Title"] --> B["Chapter 1"]
  3. Do NOT use brackets () [] {} inside the text string unless they are escaped, but better to avoid them.
  4. Use Chinese for all node labels.
  5. Output ONLY the code starting with 'graph'.
  
  Text snippet: ${text.substring(0, 25000)}...`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "text/plain",
    }
  });

  let code = response.text.trim();
  code = code.replace(/^```mermaid\s*/, '').replace(/^```\s*/, '').replace(/```$/, '');
  return code;
};

export const generateQuotes = async (text: string, existingQuotes: Quote[] = []): Promise<Quote[]> => {
  const existingText = existingQuotes.map(q => q.text).join(" | ");
  
  const prompt = `Extract 5 'Golden Sentences' or key quotes from this text. 
  1. 'text': The original quote (keep English if original is English).
  2. 'translation': Chinese translation.
  3. 'reason': Why it is important (in Chinese).
  
  ${existingText ? `IMPORTANT: Do NOT include these quotes that were already generated: ${existingText}` : ''}
  
  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: quotesSchema,
    }
  });

  return JSON.parse(response.text) as Quote[];
};

export const generateVocab = async (text: string, existingWords: VocabItem[] = []): Promise<VocabItem[]> => {
  const existingList = existingWords.map(w => w.word).join(", ");

  const prompt = `Extract exactly 10 difficult or key vocabulary words from this text (prefer English words if the text is English). 
  Select a diverse range of words.
  Provide IPA, Part of Speech, and Chinese meaning.
  
  ${existingList ? `Avoid these words: ${existingList}` : ''}

  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: vocabSchema,
      temperature: 0.8,
    }
  });

  return JSON.parse(response.text) as VocabItem[];
};

export const generateQuiz = async (text: string, existingQuestions: QuizQuestion[] = []): Promise<QuizQuestion[]> => {
  const existingQs = existingQuestions.map(q => q.questionCn.substring(0, 20)).join(" | ");

  const prompt = `Create 5 multiple choice questions to test understanding of this book.
  
  CRITICAL REQUIREMENTS:
  1. FOCUS: Generate "Inference" and "Critical Thinking" questions. Avoid simple fact recall. Ask "Why", "How", or "What is implied".
  2. BILINGUAL SEPARATION: Provide completely separate fields for Chinese and English versions of the question, options, and explanation.
     - Ensure 'correctAnswerIndex' is valid for the options arrays (0-based).
     - Ensure the translation is accurate and natural.
  3. ${existingQs ? `Do NOT repeat these questions: ${existingQs}` : ''}

  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: quizSchema,
      temperature: 0.9,
    }
  });

  return JSON.parse(response.text) as QuizQuestion[];
};

export const generateActionPlan = async (text: string): Promise<ActionDay[]> => {
  const prompt = `Create a 7-day learning and action plan based on this book's principles.
  IMPORTANT: Write the content in Chinese.
  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: planSchema,
    }
  });

  return JSON.parse(response.text) as ActionDay[];
};

export const generateReaderContent = async (text: string): Promise<ReaderSegment[]> => {
  const prompt = `
  Analyze the text provided. 
  1. Break the text into logical paragraphs or segments (approx 2-4 sentences each).
  2. For each segment, provide the 'original' text.
  3. Provide a 'translation' in Chinese (if original is English) or English (if original is Chinese).
  4. Ensure the output is a JSON array of objects.
  
  Do this for the first 15-20 significant paragraphs.
  Text: ${text.substring(0, 15000)}...`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: readerSchema,
    }
  });

  return JSON.parse(response.text) as ReaderSegment[];
}

export const generateReview = async (text: string, style: ReviewStyle, language: 'CN' | 'EN'): Promise<BookReview> => {
  const styleInstructions: Record<ReviewStyle, string> = {
    GENTLE: "温和评价型：先优点后局限，证据可复核，给出适用人群与阅读建议。",
    CRITICAL: "批评/商榷型：明确分歧点，做“可检验的批评”（复算数据/重读原文/对照引文），避免人身化表述。",
    ACADEMIC: "学术/研究型：引入理论框架、版本与史料、互文比较，方法透明、结论可对话。",
    ESSAY: "随笔/印象式（蒙田式）：以“我”的读法为线，容许犹疑与分岔，用具体细节承托观点。",
    NIETZSCHE: "尼采式：立场鲜明、修辞强烈、价值重估，善用对照与警句。",
    COMPARATIVE: "比较型：横向比同类书、纵向比作者前后作，差异—原因—判断层层推进。",
    DIALOGUE: "对话/商榷型：与作者或他评观点交锋，呈现“问题—回应—再论证”的链条。"
  };

  const instruction = styleInstructions[style];

  const prompt = `
  You are a Senior Book Reviewer and Content Strategist. Your goal is to turn complex ideas into clear, verifiable, and spreadable reviews.
  
  Current Task: Write a deep, high-quality book review for the provided text.
  Selected Style: ${instruction}
  Output Language: ${language === 'CN' ? 'Chinese (Simplified)' : 'English'}
  
  Content Requirements:
  1. Core Arguments: Extract key theses.
  2. Evidence: Use specific cases/quotes/chapters from text.
  3. Author Context: Brief background relevance.
  4. Evaluation Dimensions: Pick 3-5 relevant ones (Structure, Logic, Evidence quality, Reality implications).
  
  Structure & Length:
  - Total Length: < 1000 words. (KEEP IT CONCISE)
  - Opening: Hook + Value Proposition.
  - Body: 3-4 Analysis Dimensions (Pros/Cons/Boundaries).
  - Conclusion: Reiterate value + Actionable advice/Reading path.
  - Format: Use Markdown for paragraphs.
  
  "De-AI" Instructions (CRITICAL):
  - Tone: ${style === 'NIETZSCHE' ? 'Sharp, philosophical, intense.' : 'Conversational, concrete, specific.'}
  - Avoid generic "AI" adjectives (e.g., "comprehensive", "insightful") without proof.
  - Use specific scenes or counter-intuitive insights.
  - Mix short and long sentences for rhythm.
  
  Output Format (JSON):
  - titles: 3 catchy candidate titles.
  - oneSentenceSummary: Max 30 chars.
  - contentMarkdown: The review body in Markdown.
  - selfCheckList: 4 items checking argument clarity, evidence, logic, and accuracy.

  Text: ${text.substring(0, 40000)}...
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash", // Using standard flash for text generation tasks
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: reviewSchema,
      temperature: 0.8, // Slightly higher for creativity in reviews
    }
  });

  return JSON.parse(response.text) as BookReview;
};

// --- Text To Speech ---

export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
  if (!text || !text.trim()) return null;
  try {
    const response = await ai.models.generateContent({
      model: ttsModelName,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ['AUDIO'] as any, // Explicitly cast to any to allow string 'AUDIO' if enum fails
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a good balanced voice
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
      return bytes.buffer;
    }
    return null;
  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
};

/**
 * Decodes raw PCM audio data from Gemini (16-bit, 24kHz usually) into an AudioBuffer.
 * This is necessary because browser's decodeAudioData expects WAV/MP3 headers which raw stream lacks.
 */
export const decodePCM = (ctx: AudioContext, arrayBuffer: ArrayBuffer, sampleRate: number = 24000): AudioBuffer => {
  const pcmData = new Int16Array(arrayBuffer);
  // Create a buffer: 1 channel, proper length, defined sample rate
  const buffer = ctx.createBuffer(1, pcmData.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  // Convert 16-bit PCM to float [-1, 1]
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
      systemInstruction: systemInstruction + " Answer in Chinese.",
    }
  });
};
