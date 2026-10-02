import { useState } from 'react';
import { X } from 'lucide-react';
import type { ImportanceLevel, Segment } from '../types';
import { IMPORTANCE_CONFIG } from '../types';
import { formatTime, formatDuration, parseTime } from '../utils';

interface Props {
  initial?: Partial<Segment>;
  videoDuration: number;
  defaultImportance: ImportanceLevel;
  onSave: (data: { title: string; importance: ImportanceLevel; startTime: number; endTime: number; note: string }) => void;
  onCancel: () => void;
}

export default function SegmentEditor({ initial, videoDuration, defaultImportance, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title || '');
  const [importance, setImportance] = useState<ImportanceLevel>(initial?.importance || defaultImportance);
  const [startStr, setStartStr] = useState(initial?.startTime != null ? formatTime(initial.startTime) : '');
  const [endStr, setEndStr] = useState(initial?.endTime != null ? formatTime(initial.endTime) : '');
  const [note, setNote] = useState(initial?.note || '');
  const [error, setError] = useState('');

  const startSec = parseTime(startStr);
  const endSec = parseTime(endStr);
  const dur = startSec != null && endSec != null && endSec > startSec ? endSec - startSec : null;

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    if (!title.trim()) { setError('Please enter a segment title'); return; }
    if (startSec == null) { setError('Invalid start time'); return; }
    if (endSec == null) { setError('Invalid end time'); return; }
    if (startSec < 0) { setError('Start time cannot be negative'); return; }
    if (videoDuration > 0 && endSec > videoDuration) { setError(`End time cannot exceed video duration (${formatTime(videoDuration)})`); return; }
    if (endSec <= startSec) { setError('End time must be after start time'); return; }
    
    setIsSaving(true);
    try {
      await onSave({ title: title.trim(), importance, startTime: startSec, endTime: endSec, note });
    } finally {
      setIsSaving(false);
    }
  };

  const levels: ImportanceLevel[] = ['critical', 'very_important', 'important', 'useful', 'optional'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="font-semibold text-sm">{initial?.id ? 'Edit Segment' : 'Add Segment'}</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-bg-hover text-text-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 pb-5 pt-3 space-y-3">
          {/* Title */}
          <div>
            <label className="text-[11px] font-medium text-text-secondary mb-1 block">Title</label>
            <input
              autoFocus
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
              placeholder="e.g., Derivation of F=ma"
              value={title} onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Importance */}
          <div>
            <label className="text-[11px] font-medium text-text-secondary mb-1.5 block">Importance</label>
            <div className="flex gap-1.5 flex-wrap">
              {levels.map(level => {
                const cfg = IMPORTANCE_CONFIG[level];
                const active = importance === level;
                return (
                  <button
                    key={level}
                    onClick={() => setImportance(level)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border
                      ${active ? 'border-current' : 'border-transparent bg-bg-tertiary hover:bg-bg-hover'}`}
                    style={active ? { color: cfg.color, backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}40` } : {}}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Times */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-text-secondary mb-1 block">Start Time</label>
              <input
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent placeholder:text-text-muted"
                placeholder="0:00"
                value={startStr} onChange={e => setStartStr(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium text-text-secondary mb-1 block">End Time</label>
              <input
                className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent placeholder:text-text-muted"
                placeholder="0:00"
                value={endStr} onChange={e => setEndStr(e.target.value)}
              />
            </div>
          </div>
          {dur != null && <p className="text-xs text-text-muted">Duration: {formatDuration(dur)}</p>}

          {/* Note */}
          <div>
            <label className="text-[11px] font-medium text-text-secondary mb-1 block">Notes (optional)</label>
            <textarea
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent placeholder:text-text-muted resize-none h-20"
              placeholder="Add any notes about this segment..."
              value={note} onChange={e => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-importance-critical">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onCancel} disabled={isSaving} className="flex-1 py-2 rounded-lg text-sm border border-border hover:bg-bg-hover transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2 rounded-lg text-sm bg-accent hover:bg-accent-hover text-white font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
              {isSaving ? 'Saving...' : initial?.id ? 'Save Changes' : 'Save Segment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
