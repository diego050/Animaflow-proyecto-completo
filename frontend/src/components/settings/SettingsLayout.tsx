import { Settings } from 'lucide-react';
import type { ReactNode } from 'react';

export type TabKey = 'profile' | 'preferences' | 'tts' | 'api' | 'billing';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface SettingsLayoutProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  tabs: TabDef[];
  children: ReactNode;
}

export function SettingsLayout({ activeTab, onTabChange, tabs, children }: SettingsLayoutProps) {
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
          <Settings size={24} className="text-mint-precision" />
          Configuración
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Ajustes de cuenta y preferencias de la plataforma.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-lg p-1 mb-6 max-w-2xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-surface-highest text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto">
        {children}
      </div>
    </div>
  );
}
