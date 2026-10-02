import { useState } from 'react';
import { Plus, ListVideo, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';

export default function PlaylistsPage() {
  const store = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (isSaving || !newName.trim()) return;
    setIsSaving(true);
    try {
      await store.addPlaylist({
        name: newName.trim(),
        description: newDesc.trim(),
        lectureIds: []
      });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this playlist?')) {
      await store.deletePlaylist(id);
    }
  };

  if (store.loading) return <div className="p-8 text-text-muted">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Playlists</h2>
          <p className="text-text-muted mt-1">Organize lectures into custom collections.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Create Playlist
        </button>
      </div>

      {showCreate && (
        <div className="bg-bg-secondary border border-border p-5 rounded-2xl mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-text-secondary mb-1 block">Playlist Name</label>
            <input
              autoFocus
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              placeholder="e.g., Pre-Exam Revision"
              value={newName} onChange={e => setNewName(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-text-secondary mb-1 block">Description (Optional)</label>
            <input
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              placeholder="e.g., Important physics concepts..."
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setShowCreate(false)} disabled={isSaving} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm border border-border hover:bg-bg-hover disabled:opacity-50">Cancel</button>
            <button onClick={handleCreate} disabled={isSaving} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent-hover disabled:opacity-70">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {store.playlists.map(playlist => (
          <Link key={playlist.id} to={`/playlists/${playlist.id}`} className="block group relative">
            <div className="bg-bg-secondary border border-border p-6 rounded-2xl hover:border-accent transition-all hover:shadow-lg h-full flex flex-col">
              
              <button 
                onClick={(e) => handleDelete(e, playlist.id)}
                className="absolute top-3 right-3 p-1.5 bg-bg-primary/80 backdrop-blur rounded-lg text-text-muted hover:text-importance-critical opacity-0 group-hover:opacity-100 transition-opacity z-20"
                title="Delete Playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ListVideo className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-text-primary mb-1">{playlist.name}</h3>
              {playlist.description && <p className="text-sm text-text-muted mb-4 line-clamp-2">{playlist.description}</p>}
              
              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-sm text-text-muted">
                <span>{playlist.lectureIds.length} Lectures</span>
              </div>
            </div>
          </Link>
        ))}

        {store.playlists.length === 0 && !showCreate && (
          <div className="col-span-full py-16 text-center bg-bg-secondary/50 border border-dashed border-border rounded-2xl text-text-muted flex flex-col items-center">
            <ListVideo className="w-10 h-10 mb-3 text-text-secondary" />
            <p>You haven't created any playlists yet.</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 text-sm text-accent hover:underline">Create your first playlist</button>
          </div>
        )}
      </div>
    </div>
  );
}
