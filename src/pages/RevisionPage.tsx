import { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { Play } from 'lucide-react';
import { IMPORTANCE_CONFIG, type ImportanceLevel, type Segment } from '../types';
import { formatDuration, formatTime } from '../utils';
import RevisionPlayer from '../components/RevisionPlayer';

export default function RevisionPage() {
  const store = useStore();

  const [subjectId, setSubjectId] = useState<string>('');
  const [chapterId, setChapterId] = useState<string>('');
  const [selectedImportance, setSelectedImportance] = useState<Record<ImportanceLevel, boolean>>({
    critical: true,
    very_important: true,
    important: true,
    useful: true,
    optional: false
  });
  const [durationLimit, setDurationLimit] = useState<number>(30 * 60);
  
  // Store a frozen copy of segments when playing so React re-renders don't reset it
  const [playingSegments, setPlayingSegments] = useState<Segment[] | null>(null);

  const levels = Object.keys(IMPORTANCE_CONFIG) as ImportanceLevel[];

  // Generate revision list
  const revisionList = useMemo(() => {
    if (!subjectId) return { segments: [] as Segment[], totalTime: 0 };

    let lecturesToInclude = store.lectures.filter(l => l.subjectId === subjectId);
    if (chapterId) {
      lecturesToInclude = lecturesToInclude.filter(l => l.chapterId === chapterId);
    }
    const lectureIds = new Set(lecturesToInclude.map(l => l.id));

    let eligibleSegments = store.segments.filter(s => 
      lectureIds.has(s.lectureId) && 
      selectedImportance[s.importance]
    );

    // Sort by importance rank (highest first), then by chronology
    eligibleSegments.sort((a, b) => {
      const rankDiff = IMPORTANCE_CONFIG[b.importance].rank - IMPORTANCE_CONFIG[a.importance].rank;
      if (rankDiff !== 0) return rankDiff;
      return a.startTime - b.startTime;
    });

    // Enforce duration limit
    let totalTime = 0;
    const finalSegments: Segment[] = [];
    for (const seg of eligibleSegments) {
      const dur = seg.endTime - seg.startTime;
      if (totalTime + dur <= durationLimit * 1.1) {
        finalSegments.push(seg);
        totalTime += dur;
      }
    }

    return { segments: finalSegments, totalTime };
  }, [store.segments, store.lectures, subjectId, chapterId, selectedImportance, durationLimit]);

  const handleStartRevision = useCallback(() => {
    if (revisionList.segments.length > 0) {
      // Freeze a copy so navigating away from config doesn't lose the list
      setPlayingSegments([...revisionList.segments]);
    }
  }, [revisionList.segments]);

  const handleExitRevision = useCallback(() => {
    setPlayingSegments(null);
  }, []);

  if (store.loading) return <div className="p-8 text-text-muted">Loading...</div>;

  // Revision Player mode
  if (playingSegments && playingSegments.length > 0) {
    return (
      <RevisionPlayer 
        segments={playingSegments} 
        lectures={store.lectures} 
        onExit={handleExitRevision} 
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Revision Mode</h2>
        <p className="text-text-muted">Generate a focused playlist of your most important segments to revise before an exam.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filters Panel */}
        <div className="col-span-1 bg-bg-secondary border border-border rounded-2xl p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Subject</label>
            <select
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
              value={subjectId} onChange={e => { setSubjectId(e.target.value); setChapterId(''); }}
            >
              <option value="">Select subject...</option>
              {store.subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Chapter (Optional)</label>
            <select
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
              value={chapterId} onChange={e => setChapterId(e.target.value)}
              disabled={!subjectId}
            >
              <option value="">All Chapters</option>
              {store.chapters.filter(c => c.subjectId === subjectId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Importance Levels</label>
            <div className="space-y-2">
              {levels.map(level => {
                const cfg = IMPORTANCE_CONFIG[level];
                return (
                  <label key={level} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-tertiary cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border bg-bg-primary text-accent focus:ring-accent focus:ring-offset-bg-secondary"
                      checked={selectedImportance[level]}
                      onChange={e => setSelectedImportance(prev => ({ ...prev, [level]: e.target.checked }))}
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className="text-sm font-medium">{cfg.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Available Time</label>
            <select
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
              value={durationLimit} onChange={e => setDurationLimit(Number(e.target.value))}
            >
              <option value={10 * 60}>10 minutes</option>
              <option value={20 * 60}>20 minutes</option>
              <option value={30 * 60}>30 minutes</option>
              <option value={60 * 60}>1 hour</option>
              <option value={120 * 60}>2 hours</option>
              <option value={9999999}>Unlimited</option>
            </select>
          </div>
        </div>

        {/* Results Panel */}
        <div className="col-span-1 lg:col-span-2">
          {!subjectId ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-bg-secondary/50 border border-dashed border-border rounded-2xl text-text-muted p-8 text-center">
              <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mb-4">
                <GraduationCapIcon className="w-8 h-8 text-text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Configure Your Revision</h3>
              <p className="max-w-md">Select a subject and importance levels on the left to generate a personalized revision playlist.</p>
            </div>
          ) : (
            <div className="bg-bg-secondary border border-border rounded-2xl p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold">Estimated Revision</h3>
                  <p className="text-text-muted mt-1">{revisionList.segments.length} segments • {formatDuration(revisionList.totalTime)}</p>
                </div>
                <button
                  onClick={handleStartRevision}
                  disabled={revisionList.segments.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                >
                  <Play className="w-5 h-5 fill-current" /> Start Revision
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {revisionList.segments.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <p className="mb-2">No segments match your criteria.</p>
                    <p className="text-xs">Make sure you have marked segments on your lectures and the correct importance levels are checked above.</p>
                  </div>
                ) : (
                  revisionList.segments.map((seg, idx) => {
                    const cfg = IMPORTANCE_CONFIG[seg.importance];
                    const lecture = store.lectures.find(l => l.id === seg.lectureId);
                    
                    return (
                      <div key={seg.id} className="flex gap-4 p-4 rounded-xl border border-border bg-bg-primary hover:border-text-muted transition-colors">
                        <div className="w-6 text-center text-text-muted text-sm font-mono pt-0.5">{idx + 1}</div>
                        <div className="mt-1.5 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-text-primary mb-1">{seg.title}</h4>
                          <div className="text-xs text-text-muted truncate mb-1">{lecture?.title}</div>
                          <div className="text-xs text-text-muted font-mono">{formatTime(seg.startTime)} — {formatTime(seg.endTime)}</div>
                          {seg.note && <p className="text-sm text-text-secondary bg-bg-tertiary p-2 rounded-lg italic line-clamp-2 mt-2">"{seg.note}"</p>}
                        </div>
                        <div className="text-sm font-mono text-text-muted shrink-0 text-right">
                          {formatDuration(seg.endTime - seg.startTime)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GraduationCapIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.42 10.922a2 2 0 0 1-.019 3.837l-8.5 4.36a2 2 0 0 1-1.802 0l-8.5-4.36a2 2 0 0 1-.02-3.837l8.5-4.22a2 2 0 0 1 1.842 0z"/>
      <path d="M22 10v6"/>
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
    </svg>
  );
}
