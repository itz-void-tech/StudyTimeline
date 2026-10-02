/**
 * store.ts — Lightweight reactive data store backed by Firestore.
 *
 * For the MVP we keep things simple: a React context that loads all
 * collections once at boot and exposes CRUD helpers.  Every mutation
 * writes to Firestore *and* updates local state so the UI is instant.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from './firebase';
import { generateId } from './utils';
import type { Subject, Chapter, Lecture, Segment, Playlist, Note, Material, AppSettings } from './types';

// ─── Shape ──────────────────────────────────────────────

interface Store {
  // data
  subjects: Subject[];
  chapters: Chapter[];
  lectures: Lecture[];
  segments: Segment[];
  playlists: Playlist[];
  notes: Note[];
  materials: Material[];
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  user: User | null;

  // subjects
  addSubject(s: Omit<Subject, 'id' | 'createdAt' | 'ownerId'>): Promise<Subject>;
  updateSubject(id: string, data: Partial<Subject>): Promise<void>;
  deleteSubject(id: string): Promise<void>;

  // chapters
  addChapter(c: Omit<Chapter, 'id' | 'createdAt' | 'ownerId'>): Promise<Chapter>;
  updateChapter(id: string, data: Partial<Chapter>): Promise<void>;
  deleteChapter(id: string): Promise<void>;

  // lectures
  addLecture(l: Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'totalSegments' | 'watchedSegments' | 'lastWatchedAt' | 'lastWatchedPosition' | 'watchProgress' | 'ownerId'>): Promise<Lecture>;
  updateLecture(id: string, data: Partial<Lecture>): Promise<void>;
  deleteLecture(id: string): Promise<void>;

  // segments
  addSegment(s: Omit<Segment, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<Segment>;
  updateSegment(id: string, data: Partial<Segment>): Promise<void>;
  deleteSegment(id: string): Promise<void>;

  // playlists
  addPlaylist(p: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<Playlist>;
  updatePlaylist(id: string, data: Partial<Playlist>): Promise<void>;
  deletePlaylist(id: string): Promise<void>;

  // notes
  addNote(n: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<Note>;
  updateNote(id: string, data: Partial<Note>): Promise<void>;
  deleteNote(id: string): Promise<void>;

  // materials (PDFs)
  addMaterial(m: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<Material>;
  updateMaterial(id: string, data: Partial<Material>): Promise<void>;
  deleteMaterial(id: string): Promise<void>;

  // settings
  updateSettings(data: Partial<AppSettings>): Promise<void>;
}

const StoreContext = createContext<Store | null>(null);
export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
};

// ─── Helper: Firestore CRUD factory ─────────────────────

function useCRUD<T extends { id: string, ownerId: string }>(
  collectionName: string,
  _state: T[],
  setState: React.Dispatch<React.SetStateAction<T[]>>,
  userId: string | undefined
) {
  const add = useCallback(async (data: Omit<T, 'id' | 'ownerId'>) => {
    if (!userId) throw new Error('Not authenticated');
    const id = generateId();
    const full = { ...data, id, ownerId: userId } as unknown as T;
    await setDoc(doc(db, collectionName, id), full as Record<string, unknown>);
    setState(prev => [...prev, full]);
    return full;
  }, [collectionName, setState, userId]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    if (!userId) return;
    // prevent ownerId modification
    const safeData = { ...data };
    delete safeData.ownerId;
    await updateDoc(doc(db, collectionName, id), safeData as Record<string, unknown>);
    setState(prev => prev.map(item => item.id === id ? { ...item, ...safeData } : item));
  }, [collectionName, setState, userId]);

  const remove = useCallback(async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, collectionName, id));
    setState(prev => prev.filter(item => item.id !== id));
  }, [collectionName, setState, userId]);

  return { add, update, remove };
}

// ─── Provider ───────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  playbackSpeed: 1,
  theme: 'dark',
  defaultImportance: 'important',
  rememberPlaybackPosition: true,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [chapters, setChapters]   = useState<Chapter[]>([]);
  const [lectures, setLectures]   = useState<Lecture[]>([]);
  const [segments, setSegments]   = useState<Segment[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [notes, setNotes]         = useState<Note[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [settings, setSettings]   = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading]     = useState(true);

  // 1. Setup Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        signInAnonymously(auth).catch((err) => {
          console.error("Auth error:", err);
          setAuthError(err.message || "Failed to authenticate anonymously. Did you enable Anonymous Auth in Firebase Console?");
          setLoading(false);
        });
      } else {
        setAuthError(null);
      }
    });
    return unsub;
  }, []);

  // 2. Load Data once authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    (async () => {
      setLoading(true);
      try {
        const load = async <T,>(name: string): Promise<T[]> => {
          try {
            const q = query(collection(db, name), where('ownerId', '==', user.uid));
            const snap = await getDocs(q);
            return snap.docs.map(d => d.data() as T);
          } catch (e) {
            console.warn(`Collection "${name}" could not be loaded:`, e);
            return [];
          }
        };
        const [su, ch, le, se, pl, no, ma] = await Promise.all([
          load<Subject>('subjects'),
          load<Chapter>('chapters'),
          load<Lecture>('lectures'),
          load<Segment>('segments'),
          load<Playlist>('playlists'),
          load<Note>('notes'),
          load<Material>('materials'),
        ]);
        setSubjects(su); setChapters(ch); setLectures(le);
        setSegments(se); setPlaylists(pl); setNotes(no); setMaterials(ma);

        // settings (use deterministic doc ID for user settings: settings/{userId})
        try {
          const sSnap = await getDocs(query(collection(db, 'settings'), where('ownerId', '==', user.uid)));
          if (sSnap.docs.length > 0) setSettings({ ...DEFAULT_SETTINGS, ...sSnap.docs[0].data() as AppSettings });
        } catch { /* use defaults */ }
      } catch (err) {
        console.error('Failed to load data from Firestore:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, user]);

  // CRUD hooks
  const subjectCRUD  = useCRUD<Subject>('subjects', subjects, setSubjects, user?.uid);
  const chapterCRUD  = useCRUD<Chapter>('chapters', chapters, setChapters, user?.uid);
  const lectureCRUD  = useCRUD<Lecture>('lectures', lectures, setLectures, user?.uid);
  const segmentCRUD  = useCRUD<Segment>('segments', segments, setSegments, user?.uid);
  const playlistCRUD = useCRUD<Playlist>('playlists', playlists, setPlaylists, user?.uid);
  const noteCRUD     = useCRUD<Note>('notes', notes, setNotes, user?.uid);
  const materialCRUD = useCRUD<Material>('materials', materials, setMaterials, user?.uid);

  // Wrappers that inject timestamps
  const addSubject = useCallback(async (data: Omit<Subject, 'id' | 'createdAt' | 'ownerId'>) => {
    return subjectCRUD.add({ ...data, createdAt: Date.now() });
  }, [subjectCRUD]);

  const addChapter = useCallback(async (data: Omit<Chapter, 'id' | 'createdAt' | 'ownerId'>) => {
    return chapterCRUD.add({ ...data, createdAt: Date.now() });
  }, [chapterCRUD]);

  const addLecture = useCallback(async (data: Omit<Lecture, 'id' | 'createdAt' | 'updatedAt' | 'totalSegments' | 'watchedSegments' | 'lastWatchedAt' | 'lastWatchedPosition' | 'watchProgress' | 'ownerId'>) => {
    const now = Date.now();
    return lectureCRUD.add({
      ...data,
      totalSegments: 0, watchedSegments: 0,
      lastWatchedAt: null, lastWatchedPosition: 0, watchProgress: 0,
      createdAt: now, updatedAt: now,
    });
  }, [lectureCRUD]);

  const addSegment = useCallback(async (data: Omit<Segment, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => {
    const now = Date.now();
    const seg = await segmentCRUD.add({ ...data, createdAt: now, updatedAt: now });
    // Update lecture totalSegments
    const lecture = lectures.find(l => l.id === data.lectureId);
    if (lecture) {
      await lectureCRUD.update(lecture.id, { totalSegments: (lecture.totalSegments || 0) + 1 });
    }
    return seg;
  }, [segmentCRUD, lectureCRUD, lectures]);

  const deleteSegment = useCallback(async (id: string) => {
    const seg = segments.find(s => s.id === id);
    await segmentCRUD.remove(id);
    if (seg) {
      const lecture = lectures.find(l => l.id === seg.lectureId);
      if (lecture) {
        await lectureCRUD.update(lecture.id, { totalSegments: Math.max(0, (lecture.totalSegments || 0) - 1) });
      }
    }
  }, [segmentCRUD, segments, lectures, lectureCRUD]);

  const addPlaylist = useCallback(async (data: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => {
    const now = Date.now();
    return playlistCRUD.add({ ...data, createdAt: now, updatedAt: now });
  }, [playlistCRUD]);

  const addNote = useCallback(async (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => {
    const now = Date.now();
    return noteCRUD.add({ ...data, createdAt: now, updatedAt: now });
  }, [noteCRUD]);

  const addMaterial = useCallback(async (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => {
    const now = Date.now();
    return materialCRUD.add({ ...data, createdAt: now, updatedAt: now });
  }, [materialCRUD]);

  const updateSettings = useCallback(async (data: Partial<AppSettings>) => {
    if (!user) return;
    const merged = { ...settings, ...data, ownerId: user.uid };
    await setDoc(doc(db, 'settings', `settings_${user.uid}`), merged as Record<string, unknown>);
    setSettings(merged);
  }, [settings, user]);

  const store: Store = {
    subjects, chapters, lectures, segments, playlists, notes, materials, settings, loading: (!authReady || loading) && !authError, error: authError, user,
    addSubject, updateSubject: subjectCRUD.update, deleteSubject: subjectCRUD.remove,
    addChapter, updateChapter: chapterCRUD.update, deleteChapter: chapterCRUD.remove,
    addLecture, updateLecture: lectureCRUD.update, deleteLecture: lectureCRUD.remove,
    addSegment, updateSegment: segmentCRUD.update, deleteSegment,
    addPlaylist, updatePlaylist: playlistCRUD.update, deletePlaylist: playlistCRUD.remove,
    addNote, updateNote: noteCRUD.update, deleteNote: noteCRUD.remove,
    addMaterial, updateMaterial: materialCRUD.update, deleteMaterial: materialCRUD.remove,
    updateSettings,
  };

  return React.createElement(StoreContext.Provider, { value: store }, children);
}
