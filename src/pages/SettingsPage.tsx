import { useStore } from '../store';
import { Settings, Download, Trash2 } from 'lucide-react';
import type { ImportanceLevel } from '../types';
import { IMPORTANCE_CONFIG } from '../types';

export default function SettingsPage() {
  const store = useStore();

  const handleExport = () => {
    const data = {
      subjects: store.subjects,
      chapters: store.chapters,
      lectures: store.lectures,
      segments: store.segments,
      playlists: store.playlists,
      settings: store.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyTimeline_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
      alert('In this MVP, clear data is disabled for safety. Please delete documents directly via Firebase Console or use individual delete buttons.');
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-text-muted mt-1">Customize your StudyTimeline experience.</p>
      </div>

      <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden">
        {/* Appearance */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/10 text-accent rounded-lg"><Settings className="w-5 h-5" /></div>
            <h3 className="font-semibold text-lg">Preferences</h3>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-text-secondary">Default Theme</label>
              <div className="col-span-2">
                <select
                  value={store.settings.theme}
                  onChange={e => store.updateSettings({ theme: e.target.value as any })}
                  className="w-full max-w-xs bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <label className="text-sm font-medium text-text-secondary">Default Importance</label>
              <div className="col-span-2">
                <select
                  value={store.settings.defaultImportance}
                  onChange={e => store.updateSettings({ defaultImportance: e.target.value as ImportanceLevel })}
                  className="w-full max-w-xs bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                >
                  {Object.keys(IMPORTANCE_CONFIG).map(k => (
                    <option key={k} value={k}>{IMPORTANCE_CONFIG[k as ImportanceLevel].label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <label className="text-sm font-medium text-text-secondary pt-1">Player Settings</label>
              <div className="col-span-2 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={store.settings.rememberPlaybackPosition}
                    onChange={e => store.updateSettings({ rememberPlaybackPosition: e.target.checked })}
                    className="w-4 h-4 rounded border-border bg-bg-primary text-accent focus:ring-accent"
                  />
                  <span className="text-sm">Remember playback position</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="p-6">
          <h3 className="font-semibold text-lg mb-4">Data Management</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-tertiary border border-border hover:bg-bg-hover rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Export All Data (JSON)
            </button>
            <button
              onClick={handleClear}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-importance-critical/10 text-importance-critical hover:bg-importance-critical/20 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
