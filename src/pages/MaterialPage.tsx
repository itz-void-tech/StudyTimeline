import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, ExternalLink, Trash2, FileText, Link2, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import { getPDFUrl, deletePDF } from '../services/pdfStorage';
import { getDriveEmbedUrl } from '../utils';

export default function MaterialPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Zoom & fullscreen state
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const material = store.materials.find(m => m.id === id);
  const subject = store.subjects.find(s => s.id === material?.subjectId);
  const chapter = store.chapters.find(c => c.id === material?.chapterId);

  const isDrive = Boolean(material?.driveFileId);

  useEffect(() => {
    if (!id || !material) return;

    // Drive PDFs don't need local storage lookup
    if (material.driveFileId) {
      return;
    }

    getPDFUrl(id).then(url => {
      if (url) {
        setPdfUrl(url);
      } else {
        setLoadError(true);
      }
    }).catch(() => setLoadError(true));

    return () => {
      // Revoke object URL on cleanup
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [id, material?.driveFileId]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 50));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(100);
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleDelete = async () => {
    if (!material || !window.confirm('Delete this PDF? This cannot be undone.')) return;
    // Only delete from IndexedDB if it's a local PDF
    if (!isDrive) {
      await deletePDF(material.id);
    }
    await store.deleteMaterial(material.id);
    navigate(-1);
  };

  const handleOpenDrive = () => {
    if (material?.driveUrl) {
      window.open(material.driveUrl, '_blank');
    }
  };

  const handleOpenNewTab = () => {
    if (isDrive && material?.driveFileId) {
      window.open(getDriveEmbedUrl(material.driveFileId), '_blank');
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleDownload = () => {
    if (isDrive && material?.driveFileId) {
      // For Drive PDFs, open the download URL
      window.open(`https://drive.google.com/uc?export=download&id=${material.driveFileId}`, '_blank');
    } else if (pdfUrl && material) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = material.fileName;
      a.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (store.loading) return <div className="p-8 text-text-muted">Loading...</div>;

  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-text-muted">
        <FileText className="w-12 h-12 mb-4 text-text-secondary" />
        <p className="text-lg mb-4">PDF not found</p>
        <button onClick={() => navigate(-1)} className="text-accent hover:underline">Go back</button>
      </div>
    );
  }

  const showViewer = isDrive ? Boolean(material.driveFileId) : Boolean(pdfUrl);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-2 pb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(-1)} className="p-1 text-text-muted hover:text-text-primary">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
              <span>{subject?.name || 'Subject'}</span>
              <span>/</span>
              <span>{chapter?.name || 'Chapter'}</span>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold truncate">{material.title}</h2>
              {isDrive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20 shrink-0">
                  <Link2 className="w-3 h-3" />
                  Drive
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {material.fileName}
              {material.fileSize > 0 && ` • ${formatFileSize(material.fileSize)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDrive && (
            <button onClick={handleOpenDrive} title="Open in Google Drive" className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors">
              <Link2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleDownload} title="Download" className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={handleOpenNewTab} title="Open in new tab" className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={handleDelete} title="Delete PDF" className="p-2 text-text-muted hover:text-importance-critical hover:bg-bg-hover rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF Viewer Container */}
      <div
        ref={viewerContainerRef}
        className={`flex-1 flex flex-col bg-bg-secondary border border-border rounded-xl overflow-hidden relative ${isFullscreen ? 'bg-[#0A0F1E]' : ''}`}
      >
        {/* Toolbar — zoom in / zoom out / reset / fullscreen */}
        {showViewer && (
          <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border shrink-0 z-10">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                title="Zoom Out (−)"
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={handleZoomReset}
                title="Reset Zoom"
                className="min-w-[52px] px-2 py-1 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-center"
              >
                {zoom}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={zoom >= 300}
                title="Zoom In (+)"
                className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {zoom !== 100 && (
                <button
                  onClick={handleZoomReset}
                  title="Reset to 100%"
                  className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* PDF content area */}
        <div className="flex-1 overflow-auto relative">
          {isDrive && material.driveFileId ? (
            /* Google Drive embedded PDF viewer — no sandbox so Google's controls work */
            <div
              style={{
                width: `${zoom}%`,
                height: `${zoom}%`,
                minHeight: '100%',
                transformOrigin: 'top left',
              }}
            >
              <iframe
                ref={iframeRef}
                src={getDriveEmbedUrl(material.driveFileId)}
                title={material.title}
                className="w-full h-full border-0"
                style={{ minHeight: '100%' }}
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          ) : loadError ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted p-8 text-center">
              <FileText className="w-16 h-16 mb-4 text-text-secondary" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">PDF Not Available</h3>
              <p className="max-w-md text-sm">
                This PDF file could not be found in your browser's local storage. 
                It may have been cleared, or you might be using a different browser/device.
              </p>
            </div>
          ) : pdfUrl ? (
            <div
              style={{
                width: `${zoom}%`,
                height: `${zoom}%`,
                minHeight: '100%',
                transformOrigin: 'top left',
              }}
            >
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                title={material.title}
                className="w-full h-full border-0"
                style={{ minHeight: '100%' }}
                allowFullScreen
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-text-muted">
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Loading PDF...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
