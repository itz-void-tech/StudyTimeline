import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Library, ListVideo, GraduationCap, FileText, Settings, Search, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import AddLectureModal from './AddLectureModal';
import { useStore } from '../store';

const NAV = [
  { path: '/',          label: 'Home',          icon: Home },
  { path: '/library',   label: 'Library',       icon: Library },
  { path: '/playlists', label: 'Playlists',     icon: ListVideo },
  { path: '/revision',  label: 'Revision Mode', icon: GraduationCap },
  { path: '/notes',     label: 'Notes',         icon: FileText },
  { path: '/settings',  label: 'Settings',      icon: Settings },
];

export default function AppLayout() {
  const store = useStore();
  const location = useLocation();
  const [showAddLecture, setShowAddLecture] = useState(false);

  useEffect(() => {
    const handler = () => setShowAddLecture(true);
    window.addEventListener('open-add-modal', handler);
    return () => window.removeEventListener('open-add-modal', handler);
  }, []);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-text-primary">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col bg-bg-secondary border-r border-border shrink-0">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-5 py-6">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">StudyTimeline</span>
        </Link>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV.map(n => {
            const Icon = n.icon;
            const active = isActive(n.path);
            return (
              <Link
                key={n.path}
                to={n.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors
                  ${active
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 space-y-1 border-t border-border">
          <button
            onClick={() => setShowAddLecture(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Lecture
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
            <Search className="w-4 h-4" /> Search
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border">⌘K</kbd>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-8 pb-24 md:pb-8">
          {store.error ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-importance-critical/10 flex items-center justify-center mb-6">
                <span className="text-3xl text-importance-critical">!</span>
              </div>
              <h2 className="text-xl font-bold mb-3 text-text-primary">Authentication Error</h2>
              <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                {store.error}
              </p>
              <div className="bg-bg-tertiary border border-border rounded-lg p-4 text-left w-full shadow-lg">
                <h3 className="font-semibold text-sm mb-2 text-text-primary">How to fix this:</h3>
                <ol className="list-decimal pl-5 text-xs text-text-muted space-y-2">
                  <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-accent hover:underline">Firebase Console</a>.</li>
                  <li>Open your project and go to <b>Authentication</b>.</li>
                  <li>Click on the <b>Sign-in method</b> tab.</li>
                  <li>Enable <b>Anonymous</b> and click Save.</li>
                  <li>Refresh this page.</li>
                </ol>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-bg-secondary border-t border-border flex justify-around py-2 z-50">
        {NAV.map(n => {
          const Icon = n.icon;
          return (
            <Link key={n.path} to={n.path} className={`p-2.5 rounded-xl ${isActive(n.path) ? 'text-accent bg-accent/10' : 'text-text-muted'}`}>
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* ── Add Lecture Modal ── */}
      {showAddLecture && <AddLectureModal onClose={() => setShowAddLecture(false)} />}
    </div>
  );
}
