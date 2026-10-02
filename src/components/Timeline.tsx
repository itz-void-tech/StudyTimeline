import { useMemo } from 'react';
import type { Segment } from '../types';
import { IMPORTANCE_CONFIG } from '../types';
import { formatTime } from '../utils';

interface Props {
  segments: Segment[];
  duration: number;
  currentTime: number;
  onSegmentClick: (seg: Segment) => void;
  onSeek: (time: number) => void;
  activeSegmentId?: string;
}

/** Assign segments to non-overlapping lanes (max 3). */
function assignLanes(segments: Segment[]): { seg: Segment; lane: number }[] {
  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
  const lanes: number[][] = []; // each lane tracks endTime of its last segment

  return sorted.map(seg => {
    let assigned = -1;
    for (let i = 0; i < lanes.length; i++) {
      const lastEnd = lanes[i][lanes[i].length - 1];
      if (seg.startTime >= lastEnd) { assigned = i; break; }
    }
    if (assigned === -1) {
      assigned = lanes.length;
      lanes.push([]);
    }
    lanes[assigned].push(seg.endTime);
    return { seg, lane: Math.min(assigned, 2) };
  });
}

export default function Timeline({ segments, duration, currentTime, onSegmentClick, onSeek, activeSegmentId }: Props) {
  const laned = useMemo(() => assignLanes(segments), [segments]);
  const laneCount = useMemo(() => Math.min(3, Math.max(1, ...laned.map(l => l.lane + 1))), [laned]);

  // Time labels
  const labels = useMemo(() => {
    if (duration <= 0) return [];
    let interval: number;
    if (duration < 600) interval = 60;
    else if (duration < 1800) interval = 300;
    else if (duration < 3600) interval = 600;
    else if (duration < 10800) interval = 1800;
    else interval = 3600;

    const result: number[] = [0];
    let t = interval;
    while (t < duration) { result.push(t); t += interval; }
    result.push(duration);
    return result;
  }, [duration]);

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(duration, pct * duration)));
  };

  if (duration <= 0) {
    return <div className="h-10 bg-bg-tertiary rounded-lg flex items-center justify-center text-xs text-text-muted">Duration unavailable</div>;
  }

  const cursorPct = (currentTime / duration) * 100;

  return (
    <div className="space-y-1 select-none">
      {/* Time labels */}
      <div className="relative h-4">
        {labels.map(t => (
          <span
            key={t}
            className="absolute text-[10px] font-mono text-text-muted -translate-x-1/2"
            style={{ left: `${(t / duration) * 100}%` }}
          >
            {formatTime(t)}
          </span>
        ))}
      </div>

      {/* Timeline bar */}
      <div
        className="relative bg-bg-tertiary rounded-lg cursor-pointer overflow-hidden"
        style={{ height: `${laneCount * 14 + 8}px` }}
        onClick={handleBarClick}
      >
        {/* Segments */}
        {laned.map(({ seg, lane }) => {
          const left = (seg.startTime / duration) * 100;
          const width = Math.max(0.3, ((seg.endTime - seg.startTime) / duration) * 100);
          const cfg = IMPORTANCE_CONFIG[seg.importance];
          const isActive = seg.id === activeSegmentId;

          return (
            <div
              key={seg.id}
              className="absolute rounded-sm transition-opacity cursor-pointer group"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                minWidth: '4px',
                top: `${4 + lane * 14}px`,
                height: '10px',
                backgroundColor: cfg.color,
                opacity: isActive ? 1 : 0.8,
                boxShadow: isActive ? `0 0 8px ${cfg.color}60` : 'none',
              }}
              onClick={e => { e.stopPropagation(); onSegmentClick(seg); }}
              title={`${seg.title} (${formatTime(seg.startTime)} → ${formatTime(seg.endTime)})`}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-bg-primary border border-border rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                <span className="font-medium">{seg.title}</span>
                <br />
                <span className="text-text-muted">{formatTime(seg.startTime)} → {formatTime(seg.endTime)}</span>
              </div>
            </div>
          );
        })}

        {/* Playback cursor */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white z-10 transition-[left] duration-300 ease-linear"
          style={{ left: `${cursorPct}%` }}
        />
      </div>
    </div>
  );
}
