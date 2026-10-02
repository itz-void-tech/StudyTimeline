import { useStore } from '../store';
import { FileText, Search, X, Plus, Edit2, Trash2, Video, Presentation } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IMPORTANCE_CONFIG } from '../types';
import { formatTime } from '../utils';
import type { Segment } from '../types';
import NotesSlideshow, { type SlideItem } from '../components/NotesSlideshow';

export default function NotesPage() {
  const store = useStore();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(searchParams.get('subject') || '');
  const [chapterFilter, setChapterFilter] = useState(searchParams.get('chapter') || '');
  
  // View mode
  const [expandedItem, setExpandedItem] = useState<{ type: 'segment' | 'note', item: any } | null>(null);
  
  // Edit/Create mode
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorData, setEditorData] = useState<{
    id?: string;
    type: 'segment' | 'note';
    title: string;
    content: string;
    subjectId: string;
    chapterId: string;
  } | null>(null);

  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowStartIndex, setSlideshowStartIndex] = useState(0);

  if (store.loading) return <div className="p-8 text-text-muted">Loading...</div>;

  // Filter segment notes
  const segmentNotes = store.segments
    .filter(s => s.note && s.note.trim().length > 0)
    .filter(s => s.note.toLowerCase().includes(search.toLowerCase()) || s.title.toLowerCase().includes(search.toLowerCase()))
    .filter(s => {
      if (!subjectFilter) return true;
      const lecture = store.lectures.find(l => l.id === s.lectureId);
      if (!lecture) return false;
      if (lecture.subjectId !== subjectFilter) return false;
      if (chapterFilter && lecture.chapterId !== chapterFilter) return false;
      return true;
    })
    .map(s => ({ type: 'segment' as const, item: s, updatedAt: s.updatedAt }));

  // Filter standalone notes
  const standaloneNotes = store.notes
    .filter(n => n.content && n.content.trim().length > 0 || n.title.trim().length > 0)
    .filter(n => (n.content?.toLowerCase() || '').includes(search.toLowerCase()) || n.title.toLowerCase().includes(search.toLowerCase()))
    .filter(n => {
      if (!subjectFilter) return true;
      if (n.subjectId !== subjectFilter) return false;
      if (chapterFilter && n.chapterId !== chapterFilter) return false;
      return true;
    })
    .map(n => ({ type: 'note' as const, item: n, updatedAt: n.updatedAt }));

  // Combine and sort
  const allNotes = [...segmentNotes, ...standaloneNotes].sort((a, b) => b.updatedAt - a.updatedAt);

  // Build slides array for the slideshow — ascending order (oldest first)
  // so the user reviews notes chronologically like a timeline
  const slideshowSlides: SlideItem[] = useMemo(() => {
    return [...allNotes].reverse().map(({ type, item }) => {
      if (type === 'segment') {
        const lecture = store.lectures.find(l => l.id === (item as Segment).lectureId);
        const subject = store.subjects.find(s => s.id === lecture?.subjectId);
        const chapter = store.chapters.find(c => c.id === lecture?.chapterId);
        return { type, item, subject, chapter, lecture };
      } else {
        const subject = store.subjects.find(s => s.id === item.subjectId);
        const chapter = store.chapters.find(c => c.id === item.chapterId);
        return { type, item, subject, chapter };
      }
    });
  }, [allNotes, store.lectures, store.subjects, store.chapters]);

  const availableChapters = store.chapters.filter(c => c.subjectId === subjectFilter);

  const handleOpenAddNote = () => {
    setEditorData({
      type: 'note',
      title: '',
      content: '',
      subjectId: subjectFilter || '',
      chapterId: chapterFilter || ''
    });
    setIsEditorOpen(true);
  };

  const handleEdit = (type: 'segment' | 'note', item: any) => {
    if (type === 'segment') {
      const lecture = store.lectures.find(l => l.id === item.lectureId);
      setEditorData({
        id: item.id,
        type: 'segment',
        title: item.title,
        content: item.note,
        subjectId: lecture?.subjectId || '',
        chapterId: lecture?.chapterId || ''
      });
    } else {
      setEditorData({
        id: item.id,
        type: 'note',
        title: item.title,
        content: item.content,
        subjectId: item.subjectId || '',
        chapterId: item.chapterId || ''
      });
    }
    setExpandedItem(null);
    setIsEditorOpen(true);
  };

  const handleDelete = async (type: 'segment' | 'note', id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    if (type === 'segment') {
      // Delete the segment completely, or just clear the note? Let's just clear the note to preserve the timeline marker.
      await store.updateSegment(id, { note: '' });
    } else {
      // Delete the standalone note completely
      await store.deleteNote(id);
    }
    if (expandedItem?.item.id === id) setExpandedItem(null);
  };

  const handleSaveNote = async () => {
    if (!editorData) return;
    if (!editorData.title.trim()) {
      alert("Title is required");
      return;
    }

    if (editorData.type === 'segment' && editorData.id) {
      await store.updateSegment(editorData.id, {
        title: editorData.title,
        note: editorData.content,
        updatedAt: Date.now()
      });
    } else if (editorData.type === 'note') {
      if (editorData.id) {
        await store.updateNote(editorData.id, {
          title: editorData.title,
          content: editorData.content,
          subjectId: editorData.subjectId || null,
          chapterId: editorData.chapterId || null,
          updatedAt: Date.now()
        });
      } else {
        await store.addNote({
          title: editorData.title,
          content: editorData.content,
          subjectId: editorData.subjectId || null,
          chapterId: editorData.chapterId || null,
          lectureId: null,
          segmentId: null,
        });
      }
    }
    setIsEditorOpen(false);
    setEditorData(null);
  };

  const renderExpandedModal = () => {
    if (!expandedItem) return null;
    const { type, item } = expandedItem;
    
    let subject: any, chapter: any, lecture: any, cfg: any;
    if (type === 'segment') {
      lecture = store.lectures.find(l => l.id === item.lectureId);
      subject = store.subjects.find(s => s.id === lecture?.subjectId);
      chapter = store.chapters.find(c => c.id === lecture?.chapterId);
      cfg = IMPORTANCE_CONFIG[(item as Segment).importance];
    } else {
      subject = store.subjects.find(s => s.id === item.subjectId);
      chapter = store.chapters.find(c => c.id === item.chapterId);
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setExpandedItem(null)}>
        <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {type === 'segment' && cfg && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />}
              {type === 'note' && <FileText className="w-5 h-5 text-accent shrink-0" />}
              <h2 className="text-lg font-bold text-text-primary truncate">{item.title}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => handleEdit(type, item)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors" title="Edit Note">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(type, item.id)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-importance-critical transition-colors" title="Delete Note">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => setExpandedItem(null)} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="px-6 py-3 bg-bg-tertiary border-b border-border flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-text-muted shrink-0">
            {subject && (
              <span className="px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                {subject.icon} {subject.name}
              </span>
            )}
            {chapter && <span>{chapter.name}</span>}
            {type === 'segment' && lecture && (
              <div className="flex items-center gap-1.5 text-accent">
                <Video className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{lecture.title}</span>
              </div>
            )}
            {type === 'segment' && (
              <span className="font-mono">{formatTime(item.startTime)} — {formatTime(item.endTime)}</span>
            )}
            {type === 'segment' && cfg && (
              <span className="font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
            )}
          </div>

          {/* Note Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="text-text-primary leading-relaxed text-[15px] markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {type === 'segment' ? item.note : item.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0">
            <span className="text-xs text-text-muted">
              Last updated: {new Date(item.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {type === 'segment' && (
              <Link 
                to={`/lecture/${item.lectureId}`} 
                onClick={() => setExpandedItem(null)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
              >
                Jump to Video
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEditorModal = () => {
    if (!isEditorOpen || !editorData) return null;
    
    // Editor for standalone notes vs segment notes
    const isSegment = editorData.type === 'segment';

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <h2 className="text-lg font-bold">{editorData.id ? 'Edit Note' : 'New Standalone Note'}</h2>
            <button onClick={() => { setIsEditorOpen(false); setEditorData(null); }} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
              <input 
                autoFocus
                className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                placeholder="Note Title"
                value={editorData.title}
                onChange={e => setEditorData({ ...editorData, title: e.target.value })}
              />
            </div>
            
            {/* Can only change subject/chapter if it's a standalone note */}
            {!isSegment && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-text-secondary mb-1">Subject (Optional)</label>
                  <select 
                    className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                    value={editorData.subjectId}
                    onChange={e => setEditorData({ ...editorData, subjectId: e.target.value, chapterId: '' })}
                  >
                    <option value="">None</option>
                    {store.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {editorData.subjectId && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-text-secondary mb-1">Chapter (Optional)</label>
                    <select 
                      className="w-full bg-bg-tertiary border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                      value={editorData.chapterId}
                      onChange={e => setEditorData({ ...editorData, chapterId: e.target.value })}
                    >
                      <option value="">None</option>
                      {store.chapters.filter(c => c.subjectId === editorData.subjectId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-[200px]">
              <label className="block text-sm font-medium text-text-secondary mb-1">Content</label>
              <textarea 
                className="w-full flex-1 bg-bg-tertiary border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent resize-none min-h-[250px]"
                placeholder="Write your note here..."
                value={editorData.content}
                onChange={e => setEditorData({ ...editorData, content: e.target.value })}
              />
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0 bg-bg-tertiary/50">
            <button 
              onClick={() => { setIsEditorOpen(false); setEditorData(null); }}
              className="px-4 py-2 rounded-lg font-medium text-sm text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveNote}
              className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-accent/20"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Notes</h2>
          <p className="text-text-muted mt-1">Review your annotations and standalone notes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenAddNote}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm shadow-md shadow-accent/20"
          >
            <Plus className="w-4 h-4" /> Add Note
          </button>
          {allNotes.length > 0 && (
            <button
              onClick={() => { setSlideshowStartIndex(0); setSlideshowOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-text-primary border border-border rounded-lg font-medium transition-colors text-sm"
            >
              <Presentation className="w-4 h-4" /> Slideshow
            </button>
          )}
          
          <div className="w-px h-8 bg-border hidden sm:block" />

          <select
            className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            value={subjectFilter}
            onChange={e => { setSubjectFilter(e.target.value); setChapterFilter(''); }}
          >
            <option value="">All Subjects</option>
            {store.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          
          {subjectFilter && (
            <select
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              value={chapterFilter}
              onChange={e => setChapterFilter(e.target.value)}
            >
              <option value="">All Chapters</option>
              {availableChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-accent w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {allNotes.map(({ type, item, updatedAt }) => {
          let lecture, subject, chapter, cfg;
          if (type === 'segment') {
            lecture = store.lectures.find(l => l.id === item.lectureId);
            cfg = IMPORTANCE_CONFIG[(item as Segment).importance];
          } else {
            subject = store.subjects.find(s => s.id === item.subjectId);
            chapter = store.chapters.find(c => c.id === item.chapterId);
          }

          return (
            <div
              key={`${type}-${item.id}`}
              className="bg-bg-secondary border border-border rounded-2xl flex flex-col hover:border-accent transition-colors group w-full overflow-hidden relative shadow-sm"
              style={{ maxHeight: '240px' }}
            >
              {/* Hover actions */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-bg-secondary/80 backdrop-blur rounded-lg p-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleEdit(type, item); }}
                  className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                  title="Edit Note"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(type, item.id); }}
                  className="p-1.5 rounded text-text-muted hover:text-importance-critical hover:bg-bg-hover transition-colors"
                  title="Delete Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Clickable Card Body */}
              <button onClick={() => setExpandedItem({ type, item })} className="flex flex-col p-5 h-full text-left w-full focus:outline-none">
                <div className="flex items-start gap-2 mb-3 min-w-0 w-full pr-16">
                  {type === 'segment' ? (
                    <Video className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary truncate block">
                    {type === 'segment' ? (lecture?.title || 'Unknown Video') : ((subject?.name ? `${subject.name} ${chapter ? `• ${chapter.name}` : ''}` : 'General Note'))}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-2 min-w-0 w-full">
                  {type === 'segment' && cfg && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />}
                  <h3 className="font-bold text-text-primary truncate text-lg">{item.title || 'Untitled Note'}</h3>
                </div>
                
                <div className="text-sm text-text-muted flex-1 leading-relaxed overflow-hidden mb-4 markdown-body" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {type === 'segment' ? item.note : item.content}
                  </ReactMarkdown>
                </div>
                
                <div className="mt-auto pt-4 border-t border-border flex justify-between items-center w-full shrink-0">
                  <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                    {new Date(updatedAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs font-bold text-accent group-hover:underline">
                    Read More
                  </span>
                </div>
              </button>
            </div>
          );
        })}

        {allNotes.length === 0 && (
          <div className="col-span-full py-16 text-center bg-bg-secondary/50 border border-dashed border-border rounded-2xl text-text-muted flex flex-col items-center">
            <FileText className="w-12 h-12 mb-4 text-text-secondary/50" />
            <h3 className="text-lg font-semibold text-text-primary mb-1">No notes found</h3>
            <p className="text-sm max-w-md">{search ? 'Try adjusting your search or filters.' : 'You haven\'t written any notes yet. Click the "Add Note" button above to get started, or add notes directly to video segments!'}</p>
          </div>
        )}
      </div>

      {renderExpandedModal()}
      {renderEditorModal()}
      {slideshowOpen && slideshowSlides.length > 0 && (
        <NotesSlideshow
          slides={slideshowSlides}
          startIndex={slideshowStartIndex}
          onClose={() => setSlideshowOpen(false)}
        />
      )}
    </div>
  );
}
