import { Modal } from './Modal';

interface JsonViewerProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, unknown> | null;
  title?: string;
}

export function JsonViewer({ isOpen, onClose, data, title = 'spec.json' }: JsonViewerProps) {
  if (!data) return null;

  const jsonString = JSON.stringify(data, null, 2);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="relative">
        <pre className="bg-surface-lowest border border-border-tech rounded-lg p-4 text-xs font-mono text-text-secondary/80 overflow-x-auto max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-all">
          {jsonString}
        </pre>
        <div className="flex justify-end mt-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(jsonString);
            }}
            className="px-3 py-1.5 bg-surface-highest text-text-secondary text-xs rounded-lg hover:bg-surface-high hover:text-text-primary transition-colors"
          >
            Copiar JSON
          </button>
        </div>
      </div>
    </Modal>
  );
}
