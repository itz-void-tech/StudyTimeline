import { useState, useRef } from 'react';
import { X, Upload, Video, FileText, Link2, CheckCircle, AlertCircle } from 'lucide-react';
import { useStore } from '../store';
import { extractVideoId, getYouTubeThumbnail, extractDriveFileId, getDriveEmbedUrl } from '../utils';
import { useNavigate } from 'react-router-dom';
import { savePDF } from '../services/pdfStorage';

interface Props { onClose: () => void }

type UploadMode = 'youtube' | 'pdf' | 'drive';

export default function AddLectureModal({ onClose }: Props) {
  const store = useStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<UploadMode>('youtube');
  
  // Shared fields
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newChapter, setNewChapter] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // YouTube fields
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<{ videoId: string; thumb: string } | null>(null);
  
  // PDF fields
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Drive PDF fields
  const [driveUrl, setDriveUrl] = useState('');
  const [driveFileId, setDriveFileId] = useState<string | null>(null);

  const videoId = extractVideoId(url);
  const chaptersForSubject = store.chapters.filter(c => c.subjectId === subjectId && subjectId !== '__new');

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setError('');
    const vid = extractVideoId(val);
    if (vid) {
      setPreview({ videoId: vid, thumb: getYouTubeThumbnail(vid) });
      // Try to fetch title via oEmbed
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
        .then(r => r.json())
        .then(d => { if (d.title && !title) setTitle(d.title); })
        .catch(() => {});
    } else {
      setPreview(null);
    }
  };

  const handleDriveUrlChange = (val: string) => {
    setDriveUrl(val);
    setError('');
    const fileId = extractDriveFileId(val);
    setDriveFileId(fileId);
    // Try to auto-fill a sensible title from the link
    if (fileId && !title) {
      setTitle('Drive PDF');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File is too large. Maximum size is 50 MB.');
      return;
    }
    
    setPdfFile(file);
    setError('');
    // Auto-fill title from filename if empty
    if (!title) {
      const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      setTitle(name);
    }
  };

  const resolveSubjectAndChapter = async () => {
    const needsNewSubject = subjectId === '__new' || (store.subjects.length === 0);
    if (needsNewSubject && !newSubject.trim()) { setError('Please enter a subject name'); return null; }
    if (!needsNewSubject && !subjectId) { setError('Please select a subject'); return null; }

    const needsNewChapter = chapterId === '__new' || chaptersForSubject.length === 0;
    if (needsNewChapter && !newChapter.trim()) { setError('Please enter a chapter name'); return null; }
    if (!needsNewChapter && !chapterId) { setError('Please select a chapter'); return null; }

    let finalSubjectId = subjectId;
    if (needsNewSubject) {
      const s = await store.addSubject({ name: newSubject.trim(), icon: '📚', color: '#6366F1' });
      finalSubjectId = s.id;
    }

    let finalChapterId = chapterId;
    if (needsNewChapter) {
      const c = await store.addChapter({ subjectId: finalSubjectId, name: newChapter.trim(), description: '', order: 0 });
      finalChapterId = c.id;
    }

    return { finalSubjectId, finalChapterId };
  };

  const handleSubmitYoutube = async () => {
    if (!videoId) { setError('Please enter a valid YouTube URL'); return; }
    if (!title.trim()) { setError('Please enter a title'); return; }

    const resolved = await resolveSubjectAndChapter();
    if (!resolved) return;

    const dup = store.lectures.find(l => l.youtubeVideoId === videoId);
    if (dup) { setError('This lecture already exists in your library'); return; }

    const lecture = await store.addLecture({
      youtubeVideoId: videoId,
      youtubeUrl: url,
      title: title.trim(),
      thumbnailUrl: getYouTubeThumbnail(videoId),
      duration: 0,
      subjectId: resolved.finalSubjectId,
      chapterId: resolved.finalChapterId,
      playlistIds: playlistId ? [playlistId] : [],
    });

    onClose();
    navigate(`/lecture/${lecture.id}`);
  };

  const handleSubmitPdf = async () => {
    if (!pdfFile) { setError('Please select a PDF file'); return; }
    if (!title.trim()) { setError('Please enter a title'); return; }

    const resolved = await resolveSubjectAndChapter();
    if (!resolved) return;

    // Save metadata to Firestore
    const material = await store.addMaterial({
      title: title.trim(),
      fileName: pdfFile.name,
      fileSize: pdfFile.size,
      pageCount: 0,
      subjectId: resolved.finalSubjectId,
      chapterId: resolved.finalChapterId,
    });

    // Save file blob to IndexedDB
    await savePDF(material.id, pdfFile);

    onClose();
    navigate(`/material/${material.id}`);
  };

  const handleSubmitDrive = async () => {
    if (!driveFileId) { setError('Please enter a valid Google Drive link'); return; }
    if (!title.trim()) { setError('Please enter a title'); return; }

    const resolved = await resolveSubjectAndChapter();
    if (!resolved) return;

    // Check for duplicate Drive files
    const dup = store.materials.find(m => m.driveFileId === driveFileId);
    if (dup) { setError('This PDF is already in your library'); return; }

    // Save metadata to Firestore (no local file storage needed)
    const material = await store.addMaterial({
      title: title.trim(),
      fileName: title.trim() + '.pdf',
      fileSize: 0,
      pageCount: 0,
      subjectId: resolved.finalSubjectId,
      chapterId: resolved.finalChapterId,
      driveUrl: driveUrl,
      driveFileId: driveFileId,
    });

    onClose();
    navigate(`/material/${material.id}`);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'youtube') {
        await handleSubmitYoutube();
      } else if (mode === 'pdf') {
        await handleSubmitPdf();
      } else {
        await handleSubmitDrive();
      }
    } catch (err: any) {
      console.error('Failed to add:', err);
      setError(err.message || 'Failed to save. Check your Firebase rules and connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getSubmitLabel = () => {
    if (isSubmitting) return 'Saving...';
    if (mode === 'youtube') return 'Add Lecture';
    if (mode === 'pdf') return 'Upload PDF';
    return 'Add Drive PDF';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <h2 className="text-lg font-semibold">Add New Content</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 space-y-4">
          {/* Mode Toggle — 3 tabs */}
          <div className="flex gap-1 p-1 bg-bg-tertiary rounded-lg">
            <button
              onClick={() => { setMode('youtube'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'youtube' ? 'bg-bg-primary text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Video className="w-4 h-4" /> YouTube
            </button>
            <button
              onClick={() => { setMode('pdf'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'pdf' ? 'bg-bg-primary text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
            <button
              onClick={() => { setMode('drive'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                mode === 'drive' ? 'bg-bg-primary text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Link2 className="w-4 h-4" /> Drive PDF
            </button>
          </div>

          {/* YouTube-specific */}
          {mode === 'youtube' && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">YouTube URL</label>
                <input
                  autoFocus
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
                  placeholder="https://www.youtube.com/watch?v=XXXXXXXXX"
                  value={url} onChange={e => handleUrlChange(e.target.value)}
                />
              </div>

              {preview && (
                <div className="flex gap-3 p-3 bg-bg-tertiary rounded-lg">
                  <img src={preview.thumb} alt="" className="w-28 h-20 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <input
                      className="w-full bg-transparent text-sm font-medium focus:outline-none"
                      placeholder="Lecture Title"
                      value={title} onChange={e => setTitle(e.target.value)}
                    />
                    <p className="text-xs text-text-muted mt-1">{preview.videoId}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* PDF-specific (local upload) */}
          {mode === 'pdf' && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">PDF File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {!pdfFile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-border rounded-xl bg-bg-tertiary hover:border-accent hover:bg-accent/5 transition-colors flex flex-col items-center gap-3 text-text-muted"
                  >
                    <Upload className="w-8 h-8" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">Click to upload PDF</p>
                      <p className="text-xs mt-1">Maximum file size: 50 MB</p>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg border border-border">
                    <div className="w-12 h-14 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{pdfFile.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatFileSize(pdfFile.size)}</p>
                    </div>
                    <button
                      onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title for PDF */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Title</label>
                <input
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
                  placeholder="e.g., Chapter 5 Notes"
                  value={title} onChange={e => setTitle(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Drive PDF — paste link */}
          {mode === 'drive' && (
            <>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Google Drive Link</label>
                <input
                  autoFocus
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
                  placeholder="https://drive.google.com/file/d/XXXXX/view?usp=sharing"
                  value={driveUrl} onChange={e => handleDriveUrlChange(e.target.value)}
                />
                {/* Validation feedback */}
                {driveUrl && (
                  <div className={`flex items-center gap-1.5 mt-2 text-xs ${driveFileId ? 'text-green-400' : 'text-yellow-400'}`}>
                    {driveFileId ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Valid Drive link detected</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Could not detect a Drive file ID. Make sure it's a valid sharing link.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Live PDF preview */}
              {driveFileId && (
                <div className="rounded-lg border border-border overflow-hidden bg-bg-tertiary">
                  <div className="px-3 py-2 bg-bg-hover/50 border-b border-border flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" />
                    <span className="text-xs text-text-secondary font-medium">PDF Preview</span>
                  </div>
                  <iframe
                    src={getDriveEmbedUrl(driveFileId)}
                    title="Drive PDF Preview"
                    className="w-full border-0"
                    style={{ height: '200px' }}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Title for Drive PDF */}
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Title</label>
                <input
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
                  placeholder="e.g., Physics Chapter 3 — Handwritten Notes"
                  value={title} onChange={e => setTitle(e.target.value)}
                />
              </div>

              {/* Info note */}
              <div className="text-xs text-text-muted bg-accent/5 border border-accent/20 rounded-lg px-3 py-2.5 leading-relaxed">
                <strong className="text-accent">Note:</strong> The PDF must be shared publicly on Google Drive 
                (<span className="text-text-secondary">"Anyone with the link"</span>) for it to display in the viewer.
              </div>
            </>
          )}

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Subject</label>
            {store.subjects.length > 0 ? (
              <select
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                value={subjectId} onChange={e => { setSubjectId(e.target.value); setChapterId(''); }}
              >
                <option value="">Select subject...</option>
                {store.subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                <option value="__new">+ Create new subject</option>
              </select>
            ) : (
              <input
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
                placeholder="e.g., Physics"
                value={newSubject} onChange={e => setNewSubject(e.target.value)}
              />
            )}
            {subjectId === '__new' && (
              <input
                className="w-full mt-2 bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
                placeholder="New subject name"
                value={newSubject} onChange={e => setNewSubject(e.target.value)}
              />
            )}
          </div>

          {/* Chapter */}
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Chapter</label>
            {chaptersForSubject.length > 0 ? (
              <select
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                value={chapterId} onChange={e => setChapterId(e.target.value)}
              >
                <option value="">Select chapter...</option>
                {chaptersForSubject.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new">+ Create new chapter</option>
              </select>
            ) : (
              <input
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
                placeholder="e.g., Laws of Motion"
                value={newChapter} onChange={e => setNewChapter(e.target.value)}
              />
            )}
            {chapterId === '__new' && (
              <input
                className="w-full mt-2 bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
                placeholder="New chapter name"
                value={newChapter} onChange={e => setNewChapter(e.target.value)}
              />
            )}
          </div>

          {/* Playlist (optional, only for YouTube) */}
          {mode === 'youtube' && store.playlists.length > 0 && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Playlist (Optional)</label>
              <select
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
                value={playlistId} onChange={e => setPlaylistId(e.target.value)}
              >
                <option value="">None</option>
                {store.playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-sm text-importance-critical bg-importance-critical/10 px-3 py-2 rounded-lg">{error}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getSubmitLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
