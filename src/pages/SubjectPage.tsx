import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Plus, Trash2, FileText, Video } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store';
import { formatTime, getDriveEmbedUrl } from '../utils';
import { deletePDF } from '../services/pdfStorage';

export default function SubjectPage() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'videos' | 'pdfs' | 'notes'>('videos');

  if (store.loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const subject = store.subjects.find(s => s.id === subjectId);
  if (!subject) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-text-muted">
      <p className="text-lg mb-4">Subject not found</p>
      <button onClick={() => navigate('/library')} className="text-accent hover:underline">Back to Library</button>
    </div>
  );

  const chapters = store.chapters.filter(c => c.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const lectures = store.lectures.filter(l => l.subjectId === subjectId);
  const materials = store.materials.filter(m => m.subjectId === subjectId);

  const segmentNotes = store.segments
    .filter(s => s.note && s.note.trim().length > 0)
    .filter(s => {
      const lecture = lectures.find(l => l.id === s.lectureId);
      return !!lecture;
    })
    .map(s => ({ type: 'segment' as const, item: s, updatedAt: s.updatedAt }));

  const standaloneNotes = store.notes
    .filter(n => (n.content && n.content.trim().length > 0) || n.title.trim().length > 0)
    .filter(n => n.subjectId === subjectId)
    .map(n => ({ type: 'note' as const, item: n, updatedAt: n.updatedAt }));

  const allSubjectNotes = [...segmentNotes, ...standaloneNotes].sort((a, b) => b.updatedAt - a.updatedAt);

  const handleDeleteChapter = async (chapterId: string) => {
    if (window.confirm('Are you sure you want to delete this chapter? This will also delete all its lectures and segments.')) {
      const chapterLectures = lectures.filter(l => l.chapterId === chapterId);
      for (const l of chapterLectures) {
        const segs = store.segments.filter(s => s.lectureId === l.id);
        for (const s of segs) { try { await store.deleteSegment(s.id); } catch {} }
        try { await store.deleteLecture(l.id); } catch {}
      }
      // Also delete materials in this chapter
      const chapterMaterials = materials.filter(m => m.chapterId === chapterId);
      for (const m of chapterMaterials) {
        try { await deletePDF(m.id); await store.deleteMaterial(m.id); } catch {}
      }
      try { await store.deleteChapter(chapterId); } catch {}
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (window.confirm('Delete this PDF?')) {
      await deletePDF(materialId);
      await store.deleteMaterial(materialId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/library')} className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Library
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
              {subject.icon}
            </div>
            <div>
              <h2 className="text-3xl font-bold">{subject.name}</h2>
              <p className="text-text-muted mt-1">{chapters.length} Chapters • {lectures.length} Lectures • {materials.length} PDFs</p>
            </div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event('open-add-modal'))}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Content
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-bg-secondary border border-border rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'videos' ? 'bg-bg-primary text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Play className="w-3.5 h-3.5" /> Videos ({lectures.length})
        </button>
        <button
          onClick={() => setActiveTab('pdfs')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'pdfs' ? 'bg-bg-primary text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> PDFs ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === 'notes' ? 'bg-bg-primary text-text-primary shadow-sm border border-border' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Notes ({allSubjectNotes.length})
        </button>
      </div>

      {/* Chapters & Content */}
      <div className="space-y-10">
        {chapters.length === 0 ? (
          <div className="py-16 text-center bg-bg-secondary/50 border border-dashed border-border rounded-2xl text-text-muted flex flex-col items-center">
            <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-text-secondary" />
            </div>
            <p className="text-lg font-medium text-text-primary mb-2">No chapters yet</p>
            <p className="text-sm mb-4">Add your first lecture or PDF to create a chapter.</p>
            <button
              onClick={() => window.dispatchEvent(new Event('open-add-modal'))}
              className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
            >
              + Add Content
            </button>
          </div>
        ) : (
          chapters.map(chapter => {
            const chapterLectures = lectures.filter(l => l.chapterId === chapter.id).sort((a, b) => b.createdAt - a.createdAt);
            const chapterMaterials = materials.filter(m => m.chapterId === chapter.id).sort((a, b) => b.createdAt - a.createdAt);
            const chapterNotes = allSubjectNotes.filter(n => {
              if (n.type === 'segment') {
                const lecture = lectures.find(l => l.id === n.item.lectureId);
                return lecture && lecture.chapterId === chapter.id;
              } else {
                return n.item.chapterId === chapter.id;
              }
            });
            
            // Show relevant content based on active tab
            const hasContent = activeTab === 'videos' ? chapterLectures.length > 0 : activeTab === 'pdfs' ? chapterMaterials.length > 0 : chapterNotes.length > 0;
            const contentCount = activeTab === 'videos' ? chapterLectures.length : activeTab === 'pdfs' ? chapterMaterials.length : chapterNotes.length;

            return (
              <section key={chapter.id} className="space-y-4">
                <div className="flex items-end justify-between border-b border-border pb-2 group">
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {chapter.name}
                      <button 
                        onClick={() => handleDeleteChapter(chapter.id)}
                        className="p-1 text-text-muted hover:text-importance-critical opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Chapter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-text-muted">
                      {contentCount} {activeTab === 'videos' ? 'lectures' : activeTab === 'pdfs' ? 'PDFs' : 'notes'}
                    </span>
                    {activeTab === 'notes' && chapterNotes.length > 0 && (
                      <Link
                        to={`/notes?subject=${subjectId}&chapter=${chapter.id}`}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        View All
                      </Link>
                    )}
                  </div>
                </div>
                
                {!hasContent ? (
                  <p className="text-sm text-text-muted py-4">No {activeTab === 'videos' ? 'lectures' : activeTab === 'pdfs' ? 'PDFs' : 'notes'} in this chapter.</p>
                ) : activeTab === 'videos' ? (
                  /* Video Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {chapterLectures.map(lecture => {
                      const watchProgress = lecture.duration > 0 && lecture.lastWatchedPosition 
                        ? Math.min(100, (lecture.lastWatchedPosition / lecture.duration) * 100) 
                        : 0;
                      const isCompleted = lecture.completed;
                      const isStarted = watchProgress > 0;
                      const borderClass = isCompleted 
                        ? 'border-2 border-green-500 hover:border-green-400' 
                        : isStarted 
                          ? 'border-2 border-gray-500 hover:border-gray-400' 
                          : 'border-2 border-red-500 hover:border-red-400';
                      
                      return (
                      <Link key={lecture.id} to={`/lecture/${lecture.id}`} className={`bg-bg-secondary rounded-xl overflow-hidden ${borderClass} group cursor-pointer transition-colors flex flex-col h-[200px] relative`}>
                        <div className="absolute top-2 left-2 z-30 bg-black/40 rounded p-1 backdrop-blur-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); store.updateLecture(lecture.id, { completed: !lecture.completed }); }}>
                          <input type="checkbox" checked={lecture.completed || false} onChange={() => {}} className="w-5 h-5 cursor-pointer accent-green-500" />
                        </div>
                        <div className="relative h-[110px] shrink-0 bg-bg-tertiary">
                          <img src={lecture.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-300">
                              <Play className="w-5 h-5 text-white ml-1" />
                            </div>
                          </div>
                          {lecture.duration > 0 && (
                            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[11px] font-mono text-white/90">
                              {formatTime(lecture.duration)}
                            </div>
                          )}
                          {/* Progress Line */}
                          {!isCompleted && isStarted && (
                            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50 z-20">
                              <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${watchProgress}%` }} />
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h4 className="font-medium text-sm leading-snug line-clamp-2 mb-auto group-hover:text-accent transition-colors">{lecture.title}</h4>
                          <div className="mt-3 text-[11px] text-text-muted font-medium flex items-center justify-between">
                            <span>{lecture.totalSegments || 0} segments</span>
                          </div>
                        </div>
                      </Link>
                    )})}
                  </div>
                ) : activeTab === 'notes' ? (
                  /* Notes Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {chapterNotes.map(({ type, item, updatedAt }) => {
                      let lecture;
                      if (type === 'segment') {
                        lecture = lectures.find(l => l.id === item.lectureId);
                      }
                      return (
                        <Link
                          key={`${type}-${item.id}`}
                          to={`/notes?subject=${subjectId}&chapter=${chapter.id}`}
                          className="bg-bg-secondary border border-border rounded-2xl flex flex-col hover:border-accent transition-colors group w-full overflow-hidden relative shadow-sm h-[200px]"
                        >
                          <div className="flex flex-col p-4 h-full text-left w-full">
                            <div className="flex items-start gap-2 mb-2 min-w-0 w-full">
                              {type === 'segment' ? (
                                <Video className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                              ) : (
                                <FileText className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                              )}
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary truncate block">
                                {type === 'segment' ? (lecture?.title || 'Video') : 'General Note'}
                              </span>
                            </div>
                            
                            <h3 className="font-bold text-text-primary truncate text-sm mb-1">{item.title || 'Untitled Note'}</h3>
                            
                            <div className="text-xs text-text-muted flex-1 leading-relaxed overflow-hidden mb-3 markdown-body" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {type === 'segment' ? item.note : item.content}
                              </ReactMarkdown>
                            </div>
                            
                            <div className="mt-auto pt-3 border-t border-border flex justify-between items-center w-full shrink-0">
                              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                                {new Date(updatedAt).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] font-bold text-accent group-hover:underline">
                                Read More
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  /* PDF Grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {chapterMaterials.map(mat => (
                      <div key={mat.id} className="bg-bg-secondary rounded-xl overflow-hidden border border-border group hover:border-accent transition-colors flex flex-col h-[200px] relative">
                        <Link to={`/material/${mat.id}`} className="absolute inset-0 z-0" />
                        
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMaterial(mat.id); }}
                          className="absolute top-3 right-3 p-1.5 bg-bg-primary/80 backdrop-blur rounded-lg text-text-muted hover:text-importance-critical opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          title="Delete PDF"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="relative h-[110px] shrink-0 bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center overflow-hidden">
                          {mat.driveFileId ? (
                            <div className="absolute inset-0 pointer-events-none w-[200%] h-[200%] origin-top-left scale-50">
                              <iframe
                                src={getDriveEmbedUrl(mat.driveFileId)}
                                className="w-full h-full border-0"
                                tabIndex={-1}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-20 bg-bg-primary border border-border rounded-lg shadow-md flex flex-col items-center justify-center group-hover:scale-105 transition-transform">
                              <FileText className="w-8 h-8 text-red-400 mb-1" />
                              <span className="text-[9px] font-bold text-red-400 uppercase">PDF</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col pointer-events-none">
                          <h4 className="font-medium text-sm leading-snug line-clamp-2 mb-auto group-hover:text-accent transition-colors">{mat.title}</h4>
                          <div className="mt-3 text-[11px] text-text-muted font-medium">
                            {formatFileSize(mat.fileSize)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
