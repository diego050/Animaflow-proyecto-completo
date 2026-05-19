import { FileText, Play, Download } from 'lucide-react';

const TABS = [
  { key: 'script' as const, label: 'Guión', icon: FileText },
  { key: 'preview' as const, label: 'Preview', icon: Play },
  { key: 'export' as const, label: 'Exportar', icon: Download },
] as const;

export type TabKey = (typeof TABS)[number]['key'];

interface ProjectTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  hasSpec: boolean;
}

export function ProjectTabs({ activeTab, onTabChange, hasSpec }: ProjectTabsProps) {
  return (
    <div className="flex gap-1 bg-surface-container rounded-lg p-1 mb-6">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const isDisabled = tab.key === 'preview' && !hasSpec;

        return (
          <button
            key={tab.key}
            onClick={() => !isDisabled && onTabChange(tab.key)}
            disabled={isDisabled}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-surface-highest text-text-primary'
                : isDisabled
                  ? 'text-text-secondary/30 cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
