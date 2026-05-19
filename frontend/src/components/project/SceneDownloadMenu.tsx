import { useState, useRef, useEffect } from 'react';
import { Download, Music, FileCode, Film, MoreVertical } from 'lucide-react';
import { API_BASE } from '../../api/client';
import { useToastStore } from '../../store/useToastStore';

const SCENE_DOWNLOADS = [
  { id: 'audio', label: 'Audio', icon: Music, endpoint: '/audio' },
  { id: 'spec', label: 'Spec JSON', icon: FileCode, endpoint: '/spec' },
  { id: 'video', label: 'Video', icon: Film, endpoint: '/video' },
];

interface SceneDownloadMenuProps {
  jobId: string;
  sceneIndex: number;
}

export function SceneDownloadMenu({ jobId, sceneIndex }: SceneDownloadMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { addToast } = useToastStore();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleDownload = async (type: string, endpoint: string) => {
    setDownloading(type);
    try {
      const token = localStorage.getItem('animaflow_token');
      const response = await fetch(
        `${API_BASE}/api/jobs/${jobId}/scenes/${sceneIndex}${endpoint}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const disposition = response.headers.get('content-disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch ? filenameMatch[1] : `scene_${sceneIndex + 1}_${type}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast('success', `${type} descargado`);
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Error al descargar');
    } finally {
      setDownloading(null);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-md text-text-secondary/50 hover:text-mint-precision hover:bg-mint-precision/10 transition-colors"
        title="Descargar assets de esta escena"
      >
        <MoreVertical size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-surface-container border border-border-tech rounded-lg shadow-xl z-50 py-1">
          {SCENE_DOWNLOADS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleDownload(item.id, item.endpoint)}
              disabled={downloading === item.id}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-high transition-colors disabled:opacity-50"
            >
              <item.icon size={12} />
              <span>{downloading === item.id ? 'Descargando...' : item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
