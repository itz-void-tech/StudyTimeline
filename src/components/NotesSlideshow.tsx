import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Video, FileText, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IMPORTANCE_CONFIG } from '../types';
import { formatTime } from '../utils';
import type { Segment, Note, Subject, Chapter, Lecture } from '../types';

export interface SlideItem {
  type: 'segment' | 'note';
  item: Segment | Note;
  // Pre-resolved metadata for display
  subject?: Subject;
  chapter?: Chapter;
  lecture?: Lecture;
}

interface Props {
  slides: SlideItem[];
  startIndex?: number;
  onClose: () => void;
}

export default function NotesSlideshow({ slides, startIndex = 0, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const total = slides.length;
  const slide = slides[currentIndex];

  const goNext = useCallback(() => {
    if (isAnimating || currentIndex >= total - 1) return;
    setDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, total - 1));
      setDirection(null);
      setIsAnimating(false);
    }, 280);
  }, [currentIndex, total, isAnimating]);

  const goPrev = useCallback(() => {
    if (isAnimating || currentIndex <= 0) return;
    setDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
      setDirection(null);
      setIsAnimating(false);
    }, 280);
  }, [currentIndex, isAnimating]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev]);

  // Click on left/right halves
  const handleAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const midpoint = rect.width / 2;

    if (clickX < midpoint) goPrev();
    else goNext();
  };

  if (!slide) return null;

  const { type, item, subject, chapter, lecture } = slide;
  const isSegment = type === 'segment';
  const seg = isSegment ? (item as Segment) : null;
  const note = !isSegment ? (item as Note) : null;
  const cfg = seg ? IMPORTANCE_CONFIG[seg.importance] : null;
  const content = isSegment ? seg!.note : note!.content;
  const title = item.title;

  // Slide animation class
  let slideTransform = 'translate-x-0 opacity-100';
  if (direction === 'right') slideTransform = '-translate-x-8 opacity-0';
  if (direction === 'left') slideTransform = 'translate-x-8 opacity-0';

  return (
    <div className="fixed inset-0 z-[100] bg-[#06080F] flex flex-col select-none">
      {/* ── Top bar ── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-white/50 font-mono bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <span className="text-white/90 font-semibold">{currentIndex + 1}</span>
            <span>/</span>
            <span>{total}</span>
          </div>
          {subject && (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold border border-white/10"
              style={{ backgroundColor: `${subject.color}18`, color: subject.color }}
            >
              {subject.icon} {subject.name}
            </span>
          )}
          {chapter && (
            <span className="text-xs text-white/40 font-medium">
              {chapter.name}
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all duration-200 border border-white/10"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Main slide area ── */}
      <div
        className="flex-1 flex items-center justify-center px-4 cursor-pointer relative overflow-hidden"
        onClick={handleAreaClick}
      >
        {/* Left/Right hover zones with indicators */}
        {currentIndex > 0 && (
          <div className="absolute left-0 top-0 bottom-0 w-24 z-20 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <ChevronLeft className="w-5 h-5 text-white/60" />
            </div>
          </div>
        )}
        {currentIndex < total - 1 && (
          <div className="absolute right-0 top-0 bottom-0 w-24 z-20 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </div>
        )}

        {/* Slide content card */}
        <div
          className={`w-full max-w-3xl max-h-[calc(100vh-180px)] flex flex-col transition-all duration-280 ease-out ${slideTransform}`}
        >
          {/* Card */}
          <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col max-h-full">
            {/* Header area with accent stripe */}
            <div className="relative">
              {/* Accent gradient bar */}
              <div
                className="h-1 w-full"
                style={{
                  background: cfg
                    ? `linear-gradient(to right, ${cfg.color}, ${cfg.color}60)`
                    : isSegment
                    ? 'linear-gradient(to right, #3B82F6, #3B82F660)'
                    : 'linear-gradient(to right, #A855F7, #A855F760)',
                }}
              />

              <div className="px-8 pt-8 pb-4">
                {/* Type badge + metadata row */}
                <div className="flex flex-wrap items-center gap-2.5 mb-5">
                  {isSegment ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[11px] font-semibold uppercase tracking-wider border border-accent/20">
                      <Video className="w-3 h-3" />
                      Segment Note
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 text-[11px] font-semibold uppercase tracking-wider border border-purple-500/20">
                      <FileText className="w-3 h-3" />
                      Standalone Note
                    </span>
                  )}
                  {cfg && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border"
                      style={{
                        color: cfg.color,
                        backgroundColor: `${cfg.color}12`,
                        borderColor: `${cfg.color}25`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                      {cfg.label}
                    </span>
                  )}
                  {seg && (
                    <span className="text-[11px] font-mono text-white/35 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      {formatTime(seg.startTime)} — {formatTime(seg.endTime)}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-white/95 leading-tight tracking-tight">
                  {title || 'Untitled Note'}
                </h1>

                {/* Lecture info */}
                {isSegment && lecture && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-white/35">
                    <Video className="w-3.5 h-3.5" />
                    <span className="truncate">{lecture.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-8">
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0">
              {content && content.trim() ? (
                <div className="text-white/70 text-base sm:text-lg leading-relaxed markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-white/20 italic text-base">No note content written yet.</p>
              )}
            </div>

            {/* Footer with actions */}
            <div className="px-8 py-4 border-t border-white/[0.06] flex items-center justify-between shrink-0 bg-white/[0.02]">
              <span className="text-[11px] text-white/25 font-medium">
                Updated {new Date(item.updatedAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              {isSegment && seg && (
                <Link
                  to={`/lecture/${seg.lectureId}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent/15 hover:bg-accent/25 text-accent rounded-xl text-sm font-semibold transition-all duration-200 border border-accent/20 hover:border-accent/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Jump to Video
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom progress bar ── */}
      <div className="shrink-0 px-6 pb-5">
        <div className="flex items-center gap-4">
          {/* Progress dots */}
          <div className="flex-1 flex items-center justify-center gap-1.5 overflow-x-auto py-1">
            {total <= 30 ? (
              // Show individual dots for ≤30 slides
              slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentIndex(i); }}
                  className={`shrink-0 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? 'w-8 h-2 bg-accent shadow-lg shadow-accent/30'
                      : 'w-2 h-2 bg-white/15 hover:bg-white/30'
                  }`}
                />
              ))
            ) : (
              // Show progress bar for many slides
              <div className="w-full max-w-md h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-white/20 font-medium">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/30">←</kbd>
            Previous
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/30">→</kbd>
            Next
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/30">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
