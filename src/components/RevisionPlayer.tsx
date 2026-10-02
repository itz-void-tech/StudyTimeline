import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, SkipForward, Play } from 'lucide-react';
import { formatTime } from '../utils';
import type { Segment, Lecture } from '../types';
import { IMPORTANCE_CONFIG } from '../types';

interface Props {
  segments: Segment[];
  lectures: Lecture[];
  onExit: () => void;
}

/**
 * Global YT API readiness tracker.
 * The YouTube IFrame API calls `window.onYouTubeIframeAPIReady` exactly once.
 * We capture that moment and notify all waiting consumers via callbacks.
 */
const ytApiState = {
  ready: false,
  waiters: [] as Array<() => void>,
};

function ensureYTApi(onReady: () => void) {
  // Already loaded
  if ((window as any).YT && (window as any).YT.Player) {
    ytApiState.ready = true;
    onReady();
    return;
  }

  // Register waiter
  ytApiState.waiters.push(onReady);

  // Inject script only once
  if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
    // Set up the global callback BEFORE injecting the script
    const prevCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      ytApiState.ready = true;
      // Flush all waiters
      const fns = [...ytApiState.waiters];
      ytApiState.waiters = [];
      fns.forEach(fn => fn());
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }
}

function removeYTWaiter(fn: () => void) {
  ytApiState.waiters = ytApiState.waiters.filter(w => w !== fn);
}

export default function RevisionPlayer({ segments, lectures, onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);

  const currentSegment = segments[currentIndex];
  const currentLecture = lectures.find(l => l.id === currentSegment?.lectureId);

  const handleNext = useCallback(() => {
    if (currentIndex < segments.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onExit();
    }
  }, [currentIndex, segments.length, onExit]);

  // Sync player time and auto-skip to next segment
  useEffect(() => {
    if (!playerReady || !playerRef.current || !currentSegment) return;

    const interval = setInterval(() => {
      try {
        const t = playerRef.current.getCurrentTime?.() || 0;
        setCurrentTime(t);
        if (t >= currentSegment.endTime) {
          handleNext();
        }
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [playerReady, currentSegment, currentIndex, handleNext]);

  // Load YouTube IFrame API & create/update player
  useEffect(() => {
    if (!currentLecture || !currentSegment) return;

    let cancelled = false;

    const createPlayer = () => {
      if (cancelled) return;

      // If player exists, just load new video
      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById({
            videoId: currentLecture.youtubeVideoId,
            startSeconds: Math.floor(currentSegment.startTime),
          });
          return;
        } catch {
          try { playerRef.current.destroy(); } catch {}
          playerRef.current = null;
        }
      }

      // Verify the target div exists in the DOM before creating
      const el = document.getElementById('yt-revision-player');
      if (!el) {
        // DOM not ready yet — retry shortly
        setTimeout(() => { if (!cancelled) createPlayer(); }, 50);
        return;
      }

      try {
        playerRef.current = new (window as any).YT.Player('yt-revision-player', {
          videoId: currentLecture.youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            start: Math.floor(currentSegment.startTime),
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              if (!cancelled) setPlayerReady(true);
            },
          },
        });
      } catch (e) {
        console.error('Failed to create YouTube player:', e);
      }
    };

    // Use the global YT API helper — works whether API is
    // already loaded, currently loading, or not yet requested.
    ensureYTApi(createPlayer);

    return () => {
      cancelled = true;
      removeYTWaiter(createPlayer);
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [currentLecture?.youtubeVideoId, currentSegment?.id]);

  if (!currentSegment || !currentLecture) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Player Section */}
      <div className="flex-1 flex flex-col bg-bg-secondary border border-border rounded-2xl overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary shrink-0">
          <button onClick={onExit} className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Exit Revision
          </button>
          <div className="text-sm font-medium text-text-secondary">
            Segment {currentIndex + 1} of {segments.length}
          </div>
          <button
            onClick={handleNext}
            className="flex items-center gap-1 text-accent hover:text-accent-hover text-sm font-medium"
          >
            Skip <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-black min-h-0">
          <div id="yt-revision-player" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
        </div>

        {/* Current Segment Info */}
        <div className="p-4 lg:p-5 bg-bg-secondary shrink-0">
          <div className="flex items-start gap-4">
            <div
              className="mt-1 w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: IMPORTANCE_CONFIG[currentSegment.importance].color }}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-text-primary">{currentSegment.title}</h2>
              <p className="text-sm text-text-muted mt-0.5">{currentLecture.title}</p>

              {currentSegment.note && (
                <div className="mt-3 p-3 bg-bg-tertiary rounded-lg border border-border text-sm italic text-text-secondary">
                  "{currentSegment.note}"
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-mono font-medium text-accent">
                {formatTime(currentTime)} / {formatTime(currentSegment.endTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Up Next Sidebar */}
      <div className="w-full lg:w-72 xl:w-80 flex flex-col bg-bg-secondary border border-border rounded-2xl overflow-hidden shrink-0 max-h-[300px] lg:max-h-none">
        <div className="px-4 py-3 border-b border-border bg-bg-tertiary font-bold text-sm shrink-0">
          Revision Queue
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
          {segments.map((seg, idx) => {
            const isActive = idx === currentIndex;
            const isPast = idx < currentIndex;
            const cfg = IMPORTANCE_CONFIG[seg.importance];

            return (
              <button
                key={seg.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-2.5 transition-colors ${
                  isActive
                    ? 'border-accent bg-accent/5'
                    : isPast
                      ? 'border-transparent bg-transparent opacity-50 hover:bg-bg-tertiary'
                      : 'border-border bg-bg-primary hover:border-text-muted'
                }`}
              >
                <div className="mt-1 w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
                    {seg.title}
                  </h4>
                  <div className="text-[11px] text-text-muted mt-0.5 font-mono">
                    {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                  </div>
                </div>
                {isActive && <Play className="w-3.5 h-3.5 text-accent fill-current shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
