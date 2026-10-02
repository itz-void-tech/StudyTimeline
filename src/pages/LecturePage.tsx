import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Edit2, Play, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import Timeline from '../components/Timeline';
import SegmentEditor from '../components/SegmentEditor';
import { formatTime, formatDuration } from '../utils';
import type { Segment } from '../types';
import { IMPORTANCE_CONFIG } from '../types';

export default function LecturePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lecture = store.lectures.find(l => l.id === id);
  const segments = store.segments.filter(s => s.lectureId === id).sort((a, b) => a.startTime - b.startTime);
  const subject = store.subjects.find(s => s.id === lecture?.subjectId);
  const chapter = store.chapters.find(c => c.id === lecture?.chapterId);

  const [duration, setDuration] = useState(lecture?.duration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  
  // Track which segment the user explicitly clicked/selected
  const [userSelectedSegmentId, setUserSelectedSegmentId] = useState<string | null>(null);
  
  // Marking state
  const [markStart, setMarkStart] = useState<number | null>(null);
  const [editorData, setEditorData] = useState<Partial<Segment> | null>(null);

  // Sync player time & periodically save progress
  useEffect(() => {
    if (!playerReady || !playerRef.current || !id) return;
    
    let lastSavedTime = lecture?.lastWatchedPosition || 0;
    
    const interval = setInterval(() => {
      try {
        const t = playerRef.current.getCurrentTime?.() || 0;
        setCurrentTime(t);
        if (duration === 0) {
          const d = playerRef.current.getDuration?.() || 0;
          if (d > 0) {
            setDuration(d);
            if (lecture?.duration !== d) {
              store.updateLecture(id, { duration: d });
            }
          }
        }
        
        // Only save to DB if currently playing and 5 seconds have passed since last save
        const isPlaying = playerRef.current.getPlayerState?.() === 1; // 1 is playing
        if (isPlaying && Math.abs(t - lastSavedTime) > 5) {
          store.updateLecture(id, { 
            lastWatchedPosition: t,
            lastWatchedAt: Date.now()
          });
          lastSavedTime = t;
        }
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [playerReady, duration, id]);

  // Load YouTube IFrame API & create player
  useEffect(() => {
    if (!lecture) return;

    let pollInterval: any;

    const createPlayer = () => {
      if (playerRef.current) return;
      try {
        playerRef.current = new (window as any).YT.Player('yt-player-frame', {
          videoId: lecture.youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            rel: 0,
            modestbranding: 1,
            start: Math.floor(lecture.lastWatchedPosition || 0)
          },
          events: {
            onReady: () => {
              setPlayerReady(true);
              try {
                const d = playerRef.current.getDuration?.() || 0;
                if (d > 0) {
                  setDuration(d);
                  if (lecture?.duration !== d && id) {
                    store.updateLecture(id, { duration: d });
                  }
                }
              } catch {}
            },
          }
        });
      } catch (e) {
        console.error('Failed to create YouTube player:', e);
      }
    };

    const checkAndInit = () => {
      if ((window as any).YT && (window as any).YT.Player) {
        if (pollInterval) clearInterval(pollInterval);
        createPlayer();
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      createPlayer();
    } else {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      pollInterval = setInterval(checkAndInit, 100);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [lecture?.youtubeVideoId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'm') {
        if (markStart === null) setMarkStart(currentTime);
        else {
          setEditorData({ startTime: markStart, endTime: currentTime });
          setMarkStart(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markStart, currentTime]);

  if (store.loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!lecture) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-text-muted">
      <p className="text-lg mb-4">Lecture not found</p>
      <button onClick={() => navigate('/')} className="text-accent hover:underline">Go Home</button>
    </div>
  );

  const handleSeek = (time: number, segmentId?: string) => {
    try {
      playerRef.current?.seekTo(time, true);
      setCurrentTime(time);
      // Explicitly track the user's segment selection so the polling interval
      // can't override it before the player catches up to the seek
      setUserSelectedSegmentId(segmentId ?? null);
    } catch {}
  };

  const handleMarkStart = () => setMarkStart(currentTime);
  const handleMarkEnd = () => {
    if (markStart === null) return;
    setEditorData({ startTime: markStart, endTime: currentTime });
    setMarkStart(null);
  };
  const handleAddManual = () => setEditorData({ startTime: currentTime, endTime: Math.min(duration || 9999, currentTime + 60) });

  const handleSaveSegment = async (data: any) => {
    try {
      if (editorData?.id) {
        await store.updateSegment(editorData.id, data);
      } else {
        await store.addSegment({ ...data, lectureId: lecture.id, watched: false });
      }
      setEditorData(null);
    } catch (err) {
      console.error('Failed to save segment:', err);
    }
  };

  const handleDeleteLecture = async () => {
    if (window.confirm('Are you sure you want to delete this lecture and all its segments?')) {
      try {
        await store.deleteLecture(lecture.id);
        navigate('/');
      } catch (err) {
        console.error('Failed to delete lecture:', err);
      }
    }
  };

  // Compute time-based active segment from playback position
  const timeBasedActiveId = segments.find(s => currentTime >= s.startTime && currentTime <= s.endTime)?.id;
  
  // If the user explicitly selected a segment (via click), prefer that.
  // Clear the user selection once the video plays past that segment's range,
  // so time-based tracking takes over naturally during playback.
  const userSelectedSeg = userSelectedSegmentId ? segments.find(s => s.id === userSelectedSegmentId) : null;
  const isUserSelectionStillValid = userSelectedSeg && currentTime >= userSelectedSeg.startTime - 1 && currentTime <= userSelectedSeg.endTime + 1;
  const activeSegmentId = (isUserSelectionStillValid ? userSelectedSegmentId : null) || timeBasedActiveId;

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* ── Left: Video & Timeline ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
          <button onClick={() => navigate(-1)} className="hover:text-text-primary"><ChevronLeft className="w-4 h-4" /></button>
          {subject ? (
            <Link to={`/library/${subject.id}`} className="hover:text-text-primary transition-colors">{subject.name}</Link>
          ) : (
            <span>Subject</span>
          )}
          <span>/</span>
          {subject && chapter ? (
            <Link to={`/library/${subject.id}`} className="hover:text-text-primary transition-colors">{chapter.name}</Link>
          ) : (
            <span>{chapter?.name || 'Chapter'}</span>
          )}
          <span>/</span>
          <span className="text-text-primary truncate">{lecture.title}</span>
        </div>

        {/* Video container — explicit sizing so YouTube iframe fills it */}
        <div ref={containerRef} className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-border relative">
          <div id="yt-player-frame" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        </div>

        {/* Timeline & Controls */}
        <div className="mt-6 bg-bg-secondary border border-border rounded-xl p-4 md:p-5">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold line-clamp-1 mb-1">{lecture.title}</h2>
              <div className="text-sm text-text-muted font-mono">
                {formatTime(currentTime)} / {duration > 0 ? formatDuration(duration) : '...'}
              </div>
            </div>
            
            {/* Marking Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleMarkStart}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${markStart !== null ? 'bg-accent/20 text-accent border-accent/30' : 'bg-bg-tertiary text-text-primary border-border hover:bg-bg-hover'}`}
              >
                [ ] Mark Start
                {markStart !== null && <span className="block text-[10px] opacity-80 font-mono mt-0.5">{formatTime(markStart)}</span>}
              </button>
              <button
                onClick={handleMarkEnd}
                disabled={markStart === null}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border bg-bg-tertiary border-border hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                [ ] Mark End
              </button>
              <button onClick={handleAddManual} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-bg-tertiary border border-border hover:bg-bg-hover flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add Segment
              </button>
              <div className="w-px h-6 bg-border mx-1" />
              <button onClick={handleDeleteLecture} title="Delete Lecture" className="p-1.5 text-text-muted hover:text-importance-critical rounded-lg hover:bg-bg-hover transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <Timeline
            segments={segments}
            duration={duration}
            currentTime={currentTime}
            onSegmentClick={(seg) => handleSeek(seg.startTime, seg.id)}
            onSeek={handleSeek}
            activeSegmentId={activeSegmentId}
          />
        </div>
      </div>

      {/* ── Right: Segments List ── */}
      <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col bg-bg-secondary border border-border rounded-xl h-[500px] lg:h-[calc(100vh-120px)] lg:sticky lg:top-[90px]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Segments ({segments.length})</h3>
          <button onClick={handleAddManual} className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Manually
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {segments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted">
              <p className="text-sm">No segments marked yet.</p>
              <p className="text-xs mt-1">Press <kbd className="px-1 py-0.5 rounded bg-bg-tertiary border border-border mx-1">M</kbd> while watching to mark important parts.</p>
            </div>
          ) : (
            segments.map(seg => {
              const cfg = IMPORTANCE_CONFIG[seg.importance];
              const isActive = seg.id === activeSegmentId;
              
              return (
                <div
                  key={seg.id}
                  className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border
                    ${isActive ? 'bg-bg-tertiary border-border' : 'border-transparent hover:bg-bg-tertiary'}`}
                  onClick={() => handleSeek(seg.startTime, seg.id)}
                >
                  <div className="mt-1 w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium line-clamp-2 ${isActive ? 'text-accent' : 'text-text-primary group-hover:text-accent transition-colors'}`}>
                      {seg.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted font-mono">
                      <span>{formatTime(seg.startTime)} - {formatTime(seg.endTime)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded"
                      onClick={(e) => { e.stopPropagation(); setEditorData(seg); }}
                      title="Edit Segment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 text-text-muted hover:text-importance-critical hover:bg-bg-hover rounded"
                      onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this segment?')) store.deleteSegment(seg.id); }}
                      title="Delete Segment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      className="p-1.5 text-text-muted hover:text-accent hover:bg-bg-hover rounded"
                      onClick={(e) => { e.stopPropagation(); handleSeek(seg.startTime); }}
                      title="Play Segment"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {editorData && (
        <SegmentEditor
          initial={editorData}
          videoDuration={duration}
          defaultImportance={store.settings.defaultImportance}
          onSave={handleSaveSegment}
          onCancel={() => setEditorData(null)}
        />
      )}
    </div>
  );
}
