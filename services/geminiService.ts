
import { GoogleGenAI, Schema, Type, Modality } from "@google/genai";
import { BookSummary, Quote, VocabItem, QuizQuestion, ActionDay, ReaderSegment, BookReview, ReviewStyle } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-2.5-flash';
const ttsModelName = 'gemini-2.5-flash-preview-tts';

// Global cache for TTS to improve performance
const speechCache = new Map<string, ArrayBuffer>();

// --- Helper for Rate Limiting (Exponential Backoff) ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateContentWithRetry = async (model: string, params: any, retries = 3, backoff = 2000): Promise<any> => {
  try {
    return await ai.models.generateContent({
      model: model,
      ...params
    });
  } catch (e: any) {
    if (retries > 0 && (e.status === 429 || e.toString().includes('429') || e.toString().includes('RESOURCE_EXHAUSTED') || e.toString().includes('Quota'))) {
       console.warn(`Rate limit hit for ${model}. Retrying in ${backoff}ms...`);
       await delay(backoff);
       return generateContentWithRetry(model, params, retries - 1, backoff * 2);
    }
    throw e;
  }
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

  const response = await generateContentWithRetry(modelName, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: summarySchema,
      systemInstruction: "You are an expert literary analyst. Output in Chinese.",
    }
  });

  return JSON.parse(response.text) as BookSummary;
};

export const generateMindMap = async (text: string): Promise<string> => {
  // Always Detailed but Organized
  const prompt = `Create a Mermaid.js diagram code for a detailed mind map of this book.
  
  CRITICAL LAYOUT RULES:
  1. Use 'graph LR' (Left-to-Right) orientation.
  2. **STRUCTURE**: Create a hierarchical tree.
     - Root: Book Title
     - Level 1: Main Chapters/Themes (At least 4-6 branches)
     - Level 2: Key Concepts for each chapter (At least 3-4 sub-branches each)
     - Level 3: Specific Details (Optional, where relevant)
  3. **Group related concepts** tightly.
  4. **Short Text**: Node labels must be very short (keywords only, max 6-8 chars).
  5. Use Chinese for all node labels.
  6. Wrap all node text in double quotes. e.g. A["核心主题"]
  7. Do NOT use special characters inside quotes that might break Mermaid syntax.
  8. Output ONLY the code starting with 'graph LR'.
  
  Text snippet: ${text.substring(0, 30000)}...`;

  const response = await generateContentWithRetry(modelName, {
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
  
  const prompt = `Extract the 5 most profound, philosophically significant, or structurally beautiful 'Golden Sentences' from the text.
  
  CRITICAL SELECTION CRITERIA:
  - Focus on axioms, core arguments, or emotionally resonant insights.
  - Avoid simple plot descriptions or mundane dialogue.
  - The quotes should stand alone as wisdom.

  OUTPUT FORMAT:
  1. 'text': The original quote (keep exact original language).
  2. 'translation': A **PRECISE, LITERARY, and POETIC** Chinese translation (信达雅). It must capture the exact nuance, tone, and depth of the original.
  3. 'reason': A deep analysis of why this quote is significant to the book's theme (in Chinese).
  
  ${existingText ? `IMPORTANT: Do NOT include these quotes that were already generated: ${existingText}` : ''}
  
  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await generateContentWithRetry(modelName, {
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

  const prompt = `Identify exactly 10 ADVANCED, RARE, or DOMAIN-SPECIFIC vocabulary words from the text.
  
  CRITICAL SELECTION CRITERIA:
  1. **STRICTLY FILTER** for CEFR Level C1/C2 words, GRE/SAT advanced vocabulary, or specialized academic terms.
  2. **EXCLUDE** all common A1-B2 level words (e.g., never list simple words like 'time', 'good', 'people', 'life').
  3. Focus on words that carry the **intellectual weight** of the argument or the **stylistic flair** of the author.
  4. If the text is Chinese, select advanced idioms (Chengyu) or literary terms.
  
  OUTPUT FORMAT:
  - word: The word in its lemma form.
  - ipa: International Phonetic Alphabet.
  - pos: Part of Speech.
  - meaning: A precise, context-aware Chinese definition that explains *how* the word is used here.
  
  ${existingList ? `Avoid these words: ${existingList}` : ''}

  Text snippet: ${text.substring(0, 20000)}...`;

  const response = await generateContentWithRetry(modelName, {
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

  const response = await generateContentWithRetry(modelName, {
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

  const response = await generateContentWithRetry(modelName, {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: planSchema,
    }
  });

  return JSON.parse(response.text) as ActionDay[];
};

export const generateReaderContent = async (text: string, focusChapter?: string): Promise<ReaderSegment[]> => {
  const focusInstruction = focusChapter 
    ? `FOCUS: The user is specifically reading the chapter titled "${focusChapter}". Ensure the extracted segments are primarily from this section.` 
    : "";

  const prompt = `
  Analyze the text provided. ${focusInstruction}
  
  1. Break the text into logical paragraphs or segments (approx 2-4 sentences each).
  2. For each segment, provide the 'original' text.
  3. Provide a 'translation' in Chinese (if original is English) or English (if original is Chinese).
  
  **TRANSLATION QUALITY REQUIREMENT:**
  - The translation must be **EXTREMELY PRECISE and ACADEMIC**. 
  - It should strictly reflect the author's tone, nuance, and terminology.
  - Do NOT use generic or machine-like translation. Use literary Chinese (信达雅).

  4. Ensure the output is a JSON array of objects.
  
  Text: ${text.substring(0, 20000)}...`; 

  const response = await generateContentWithRetry(modelName, {
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
    DIALOGUE: "对话/商榷型：与作者或他评观点交锋，呈现“问题—回应—再论证”的链条。",
    SUDONGPO: "苏东坡（古文）式：使用文言文或半文半白，气势磅礴，豁达洒脱，引经据典，兼具文学性与哲理性。"
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
  - contentMarkdown: The full review body in Markdown.
  - selfCheckList: 4 items checking argument clarity, evidence, logic, and accuracy.

  Text: ${text.substring(0, 40000)}...
  `;

  const response = await generateContentWithRetry("gemini-2.5-flash", {
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: reviewSchema,
      temperature: 0.8,
    }
  });

  return JSON.parse(response.text) as BookReview;
};

// --- Text To Speech ---

export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
  if (!text || !text.trim()) return null;
  
  // Check global cache first
  if (speechCache.has(text)) {
      return speechCache.get(text)!.slice(0); // Return a copy of buffer
  }

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
      speechCache.set(text, buffer.slice(0)); // Store copy in cache
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
      // Clean quotes instruction added
      systemInstruction: systemInstruction + " Answer in Chinese. Do NOT wrap your answer in quotes. Do not use Markdown quotes block unless it is code.",
    }
  });
};
