
export enum AppState {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  DASHBOARD = 'DASHBOARD',
}

export enum TabView {
  SUMMARY = 'SUMMARY',
  QUOTES = 'QUOTES',
  VOCAB = 'VOCAB',
  PRACTICE = 'PRACTICE',
  PLAN = 'PLAN',
  READER = 'READER',
  REVIEW = 'REVIEW',
  PODCAST = 'PODCAST', 
  COACH = 'COACH', // New Voice Coach Feature
}

export type ReviewStyle = 'GENTLE' | 'CRITICAL' | 'ACADEMIC' | 'ESSAY' | 'NIETZSCHE' | 'COMPARATIVE' | 'DIALOGUE' | 'SUDONGPO';

export type ComplexityLevel = 'NORMAL' | 'KIDS';

export interface Theme {
  id: string;
  name: string;
  bgClass: string; // Tailwind classes for background
  sidebarClass: string;
  activeTabClass: string;
  textClass: string;
  accentColor: string;
  cardClass: string;
}

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
  sentence: string; // Example sentence
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
  language?: 'CN' | 'EN';
}

export interface PodcastScriptLine {
  speaker: string;
  text: string;
}

export interface PodcastResult {
  title: string;
  script: PodcastScriptLine[];
  audioBuffer?: ArrayBuffer;
}

export interface AnalysisResult {
  summary?: BookSummary;
  quotes?: Quote[];
  vocab?: VocabItem[];
  quiz?: QuizQuestion[];
  actionPlan?: ActionDay[];
  readerContent?: ReaderSegment[];
  bookReview?: BookReview;
  podcast?: PodcastResult;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
