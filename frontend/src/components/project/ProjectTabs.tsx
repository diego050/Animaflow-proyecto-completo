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
  isSegmented?: boolean;
  sceneCount?: number;
  isReadyToRender?: boolean;
  hasExports?: boolean;
}

export function ProjectTabs({ activeTab, onTabChange, hasSpec, isSegmented = false, sceneCount, isReadyToRender, hasExports }: ProjectTabsProps) {
  // When segmented, only show script tab
  const visibleTabs = isSegmented
    ? TABS.filter(t => t.key === 'script')
    : TABS;

  return (
    <div className="flex gap-1 bg-surface-container rounded-lg p-1 mb-6">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const isDisabled = tab.key === 'preview' && !hasSpec;

        return (
          <button
            key={tab.key}
            onClick={() => !isDisabled && onTabChange(tab.key)}
            disabled={isDisabled}
            className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              isActive
                ? 'bg-mint-precision/10 text-mint-precision border-b-2 border-mint-precision'
                : isDisabled
                  ? 'text-text-secondary/30 cursor-not-allowed opacity-40'
                  : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>

            {/* Badges */}
            {tab.key === 'script' && sceneCount !== undefined && sceneCount > 0 && (
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                isActive ? 'bg-mint-precision/20 text-mint-precision' : 'bg-surface-highest text-text-secondary/50'
              }`}>
                {sceneCount}
              </span>
            )}
            {tab.key === 'preview' && isReadyToRender && (
              <span className="ml-1 flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-mint-precision/10 text-mint-precision font-semibold">
                <span className="w-1 h-1 rounded-full bg-mint-precision animate-pulse" />
                Live
              </span>
            )}
            {tab.key === 'export' && hasExports && (
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                isActive ? 'bg-cadmium-orange/20 text-cadmium-orange' : 'bg-cadmium-orange/10 text-cadmium-orange/70'
              }`}>
                Nuevo
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
