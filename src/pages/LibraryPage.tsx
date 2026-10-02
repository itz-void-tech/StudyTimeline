import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';

export default function LibraryPage() {
  const store = useStore();

  const handleDeleteSubject = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const hasLectures = store.lectures.some(l => l.subjectId === id);
    if (hasLectures) {
      if (!window.confirm('This subject has lectures. Deleting it will also remove all its lectures and segments. Continue?')) return;
      // Delete all lectures & segments under this subject
      const lectureIds = store.lectures.filter(l => l.subjectId === id).map(l => l.id);
      for (const lid of lectureIds) {
        const segs = store.segments.filter(s => s.lectureId === lid);
        for (const seg of segs) { try { await store.deleteSegment(seg.id); } catch {} }
        try { await store.deleteLecture(lid); } catch {}
      }
      // Delete chapters
      const chaps = store.chapters.filter(c => c.subjectId === id);
      for (const ch of chaps) { try { await store.deleteChapter(ch.id); } catch {} }
    } else {
      if (!window.confirm('Delete this subject?')) return;
      // Delete empty chapters too
      const chaps = store.chapters.filter(c => c.subjectId === id);
      for (const ch of chaps) { try { await store.deleteChapter(ch.id); } catch {} }
    }
    try { await store.deleteSubject(id); } catch {}
  };

  if (store.loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const subjectsWithCounts = store.subjects.map(sub => ({
    ...sub,
    lectureCount: store.lectures.filter(l => l.subjectId === sub.id).length,
    chapterCount: store.chapters.filter(c => c.subjectId === sub.id).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Library</h2>
          <p className="text-text-muted mt-1">Your subjects and lectures, organized.</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event('open-add-modal'))}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add Lecture
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {subjectsWithCounts.map(sub => (
          <Link key={sub.id} to={`/library/${sub.id}`} className="block group">
            <div className="bg-bg-secondary border border-border p-6 rounded-2xl hover:shadow-lg transition-all relative overflow-hidden h-full flex flex-col"
                 onMouseEnter={e => e.currentTarget.style.borderColor = sub.color}
                 onMouseLeave={e => e.currentTarget.style.borderColor = ''}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.03] rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500" style={{ color: sub.color }} />
              
              <button 
                onClick={(e) => handleDeleteSubject(e, sub.id)}
                className="absolute top-3 right-3 p-1.5 bg-bg-primary/80 backdrop-blur rounded-lg text-text-muted hover:text-importance-critical opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title="Delete Subject"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: `${sub.color}15`, color: sub.color }}>
                  {sub.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg group-hover:text-white transition-colors">{sub.name}</h3>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm text-text-muted relative z-10 group-hover:text-text-secondary transition-colors">
                <span>{sub.chapterCount} Chapters</span>
                <span>{sub.lectureCount} Lectures</span>
              </div>
            </div>
          </Link>
        ))}

        {subjectsWithCounts.length === 0 && (
          <div className="col-span-full py-16 text-center bg-bg-secondary/50 border border-dashed border-border rounded-2xl text-text-muted flex flex-col items-center">
            <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-text-secondary" />
            </div>
            <p className="text-lg font-medium text-text-primary mb-2">Your library is empty</p>
            <p className="text-sm mb-4">Add your first lecture to create a subject automatically.</p>
            <button
              onClick={() => window.dispatchEvent(new Event('open-add-modal'))}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
            >
              + Add First Lecture
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
