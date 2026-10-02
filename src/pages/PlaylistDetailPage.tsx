import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Plus, Play, Trash2, X } from 'lucide-react';
import { useStore } from '../store';
import { formatTime } from '../utils';
import type { Lecture } from '../types';

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const playlist = store.playlists.find(p => p.id === id);
  
  if (store.loading) return <div className="p-8 text-text-muted">Loading...</div>;
  
  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-text-muted">
        <p className="text-lg mb-4">Playlist not found</p>
        <button onClick={() => navigate('/playlists')} className="text-accent hover:underline">Back to Playlists</button>
      </div>
    );
  }

  // Get lectures that belong to this playlist
  const playlistLectures = store.lectures.filter(l => playlist.lectureIds.includes(l.id));
  
  // Get lectures that are NOT in this playlist (for the add modal)
  const availableLectures = store.lectures.filter(l => !playlist.lectureIds.includes(l.id));

  const handleRemoveLecture = async (lectureId: string) => {
    if (window.confirm('Remove this lecture from the playlist?')) {
      const newIds = playlist.lectureIds.filter(id => id !== lectureId);
      await store.updatePlaylist(playlist.id, { lectureIds: newIds });
      
      // Also update the lecture's playlistIds array
      const lecture = store.lectures.find(l => l.id === lectureId);
      if (lecture) {
        const newPlaylistIds = (lecture.playlistIds || []).filter(pid => pid !== playlist.id);
        await store.updateLecture(lecture.id, { playlistIds: newPlaylistIds });
      }
    }
  };

  const handleAddLecture = async (lecture: Lecture) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const newIds = [...playlist.lectureIds, lecture.id];
      await store.updatePlaylist(playlist.id, { lectureIds: newIds });
      
      // Also update the lecture's playlistIds array
      const newPlaylistIds = [...(lecture.playlistIds || []), playlist.id];
      await store.updateLecture(lecture.id, { playlistIds: newPlaylistIds });
      
      setShowAddModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <button onClick={() => navigate('/playlists')} className="hover:text-text-primary flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Playlists
        </button>
        <span>/</span>
        <span className="text-text-primary">{playlist.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{playlist.name}</h2>
          {playlist.description && <p className="text-text-muted mt-1">{playlist.description}</p>}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Add Lecture
        </button>
      </div>

      {playlistLectures.length === 0 ? (
        <div className="py-16 text-center bg-bg-secondary/50 border border-dashed border-border rounded-2xl text-text-muted flex flex-col items-center">
          <p>No lectures in this playlist yet.</p>
          <button onClick={() => setShowAddModal(true)} className="mt-4 text-sm text-accent hover:underline">Add your first lecture</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlistLectures.map(lecture => {
            const subject = store.subjects.find(s => s.id === lecture.subjectId);
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
              <div key={lecture.id} className={`bg-bg-secondary rounded-2xl overflow-hidden ${borderClass} group relative h-[220px] flex flex-col`}>
                <Link to={`/lecture/${lecture.id}`} className="absolute inset-0 z-0"></Link>
                
                <div className="absolute top-2 left-2 z-30 bg-black/40 rounded p-1 backdrop-blur-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); store.updateLecture(lecture.id, { completed: !lecture.completed }); }}>
                  <input type="checkbox" checked={lecture.completed || false} onChange={() => {}} className="w-5 h-5 cursor-pointer accent-green-500" />
                </div>

                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveLecture(lecture.id); }}
                  className="absolute top-3 right-3 p-1.5 bg-bg-primary/80 backdrop-blur rounded-lg text-text-muted hover:text-importance-critical opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Remove from playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="relative h-[130px] bg-bg-tertiary shrink-0 pointer-events-none">
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
                <div className="p-4 flex-1 flex flex-col pointer-events-none">
                  <h4 className="font-medium text-[15px] leading-snug line-clamp-2 mb-auto group-hover:text-accent transition-colors">{lecture.title}</h4>
                  <div className="mt-3 flex items-center justify-between">
                    {subject && (
                      <span className="text-[11px] font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${subject.color}15`, color: subject.color }}>
                        {subject.icon} {subject.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lecture Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-semibold">Add Lecture to {playlist.name}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-bg-hover text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="overflow-y-auto p-5">
              {availableLectures.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <p>All your lectures are already in this playlist!</p>
                  <Link to="/" onClick={() => setShowAddModal(false)} className="mt-2 text-sm text-accent hover:underline block">Go add some new lectures</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableLectures.map(lecture => {
                    const subject = store.subjects.find(s => s.id === lecture.subjectId);
                    return (
                      <div key={lecture.id} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-bg-tertiary hover:border-accent transition-colors">
                        <img src={lecture.thumbnailUrl} alt="" className="w-24 h-[54px] object-cover rounded-lg shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-1">{lecture.title}</h4>
                          <p className="text-xs text-text-muted mt-1">{subject?.name || 'Unknown Subject'}</p>
                        </div>
                        <button 
                          onClick={() => handleAddLecture(lecture)}
                          disabled={isSaving}
                          className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
