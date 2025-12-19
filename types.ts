
export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CONVERTER = 'CONVERTER',
  DOCUMENTATION = 'DOCUMENTATION'
}

export interface GeneratedCode {
  html: string;
  css: string;
  javascript: string;
}

export interface HistoryItem {
  id: string;
  name: string;
  timestamp: number;
  code: GeneratedCode;
  previewUrl: string;
  fontFamily: string;
}

export interface FileUpload {
  file: File;
  previewUrl: string;
  base64: string;
}
