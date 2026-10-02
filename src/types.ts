// ─── Types ──────────────────────────────────────────────

export type ImportanceLevel = 'critical' | 'very_important' | 'important' | 'useful' | 'optional';

export interface Subject {
  id: string;
  ownerId: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
}

export interface Chapter {
  id: string;
  ownerId: string;
  subjectId: string;
  name: string;
  description: string;
  order: number;
  createdAt: number;
}

export interface Lecture {
  id: string;
  ownerId: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  subjectId: string;
  chapterId: string;
  playlistIds: string[];
  totalSegments: number;
  watchedSegments: number;
  lastWatchedAt: number | null;
  lastWatchedPosition: number;
  watchProgress: number;
  completed?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Segment {
  id: string;
  ownerId: string;
  lectureId: string;
  startTime: number;
  endTime: number;
  title: string;
  importance: ImportanceLevel;
  note: string;
  watched: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Playlist {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  lectureIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Material {
  id: string;
  ownerId: string;
  title: string;
  fileName: string;
  fileSize: number;       // in bytes
  pageCount: number;      // 0 if unknown
  subjectId: string;
  chapterId: string;
  driveUrl?: string;      // original Google Drive sharing link
  driveFileId?: string;   // extracted file ID from Drive link
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  lectureId: string | null;
  chapterId: string | null;
  subjectId: string | null;
  segmentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  playbackSpeed: number;
  theme: 'dark' | 'light' | 'system';
  defaultImportance: ImportanceLevel;
  rememberPlaybackPosition: boolean;
}

// ─── Constants ──────────────────────────────────────────

export const IMPORTANCE_CONFIG: Record<ImportanceLevel, {
  label: string;
  color: string;
  rank: number;
  description: string;
}> = {
  critical:       { label: 'Critical',       color: '#EF4444', rank: 5, description: 'Must revise before exam' },
  very_important: { label: 'Very Important', color: '#F97316', rank: 4, description: 'Should revise if possible' },
  important:      { label: 'Important',      color: '#EAB308', rank: 3, description: 'Worth revising if time permits' },
  useful:         { label: 'Useful',         color: '#22C55E', rank: 2, description: 'Helpful but not essential' },
  optional:       { label: 'Optional',       color: '#3B82F6', rank: 1, description: 'Nice to have' },
};

export const DEFAULT_SUBJECTS: { name: string; icon: string; color: string }[] = [
  { name: 'Physics',      icon: '🔬', color: '#6366F1' },
  { name: 'Chemistry',    icon: '⚗️', color: '#EC4899' },
  { name: 'Biology',      icon: '🧬', color: '#22C55E' },
  { name: 'Mathematics',  icon: '📐', color: '#3B82F6' },
  { name: 'Geography',    icon: '🌍', color: '#F59E0B' },
  { name: 'History',      icon: '📜', color: '#A855F7' },
];
