

export enum AppState {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  DASHBOARD = 'DASHBOARD',
}

export enum TabView {
  SUMMARY = 'SUMMARY',
  MINDMAP = 'MINDMAP',
  QUOTES = 'QUOTES',
  VOCAB = 'VOCAB',
  PRACTICE = 'PRACTICE',
  PLAN = 'PLAN',
  READER = 'READER',
  REVIEW = 'REVIEW', // New Tab
}

export type ReviewStyle = 'GENTLE' | 'CRITICAL' | 'ACADEMIC' | 'ESSAY' | 'NIETZSCHE' | 'COMPARATIVE' | 'DIALOGUE' | 'SUDONGPO';

export interface ChapterSummary {
  chapterTitle: string;
  summary: string;
}

export interface BookSummary {
  title: string;
  author?: string;
  overallSummary: string;
  chapters: ChapterSummary[];
}

export interface VocabItem {
  word: string;
  ipa: string;
  pos: string; // Part of Speech
  meaning: string;
}

export interface Quote {
  text: string;
  translation: string;
  source?: string;
  reason: string; // Why it's important
}

export interface QuizQuestion {
  questionCn: string;
  questionEn: string;
  optionsCn: string[];
  optionsEn: string[];
  correctAnswerIndex: number;
  explanationCn: string;
  explanationEn: string;
}

export interface ActionDay {
  day: number;
  focus: string;
  tasks: string[];
}

export interface ReaderSegment {
  original: string;
  translation: string;
}

export interface BookReview {
  titles: string[];
  oneSentenceSummary: string;
  contentMarkdown: string;
  selfCheckList: string[];
}

export interface AnalysisResult {
  summary?: BookSummary;
  mindMapMarkdown?: string;
  quotes?: Quote[];
  vocab?: VocabItem[];
  quiz?: QuizQuestion[];
  actionPlan?: ActionDay[];
  readerContent?: ReaderSegment[];
  bookReview?: BookReview;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}