import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store';
import AppLayout from './components/AppLayout';
import HomePage from './pages/HomePage';
import LecturePage from './pages/LecturePage';
import LibraryPage from './pages/LibraryPage';
import SubjectPage from './pages/SubjectPage';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistDetailPage from './pages/PlaylistDetailPage';
import RevisionPage from './pages/RevisionPage';
import NotesPage from './pages/NotesPage';
import MaterialPage from './pages/MaterialPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <StoreProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="lecture/:id" element={<LecturePage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="library/:subjectId" element={<SubjectPage />} />
            <Route path="playlists" element={<PlaylistsPage />} />
            <Route path="playlists/:id" element={<PlaylistDetailPage />} />
            <Route path="revision" element={<RevisionPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="material/:id" element={<MaterialPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </StoreProvider>
  );
}

export default App;
