import { useState } from 'react';
import { User, Palette, Key, CreditCard, Volume2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsLayout, type TabKey } from '../../components/settings/SettingsLayout';
import { ProfileSection } from '../../components/settings/ProfileSection';
import { PreferencesSection } from '../../components/settings/PreferencesSection';
import { ApiKeysSection } from '../../components/settings/ApiKeysSection';
import { LLMSettingsSection } from '../../components/settings/LLMSettingsSection';
import { TTSProviderSection } from '../../components/settings/TTSProviderSection';
import { DesignTemplatesSection } from '../../components/settings/DesignTemplatesSection';

const TABS = [
  { key: 'profile' as const, label: 'Perfil', icon: User },
  { key: 'preferences' as const, label: 'Preferencias', icon: Palette },
  { key: 'tts' as const, label: 'Voz', icon: Volume2 },
  { key: 'api' as const, label: 'API Keys', icon: Key },
  { key: 'designs' as const, label: 'Diseños', icon: FileText },
  { key: 'billing' as const, label: 'Facturación', icon: CreditCard },
];

function ComingSoonTab({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-surface-container border border-border-tech rounded-xl p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-high flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-text-secondary/30" />
      </div>
      <h3 className="text-lg font-display font-bold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-text-secondary text-sm max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');

  return (
    <SettingsLayout activeTab={activeTab} onTabChange={setActiveTab} tabs={TABS}>
      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <ProfileSection />
          </motion.div>
        )}

        {activeTab === 'preferences' && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <PreferencesSection />
          </motion.div>
        )}

        {activeTab === 'tts' && (
          <motion.div
            key="tts"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <TTSProviderSection />
          </motion.div>
        )}

        {activeTab === 'api' && (
          <motion.div
            key="api"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <ApiKeysSection />
            <div className="mt-6">
              <LLMSettingsSection />
            </div>
          </motion.div>
        )}

        {activeTab === 'designs' && (
          <motion.div
            key="designs"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <DesignTemplatesSection />
          </motion.div>
        )}

        {activeTab === 'billing' && (
          <motion.div
            key="billing"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <ComingSoonTab
              icon={CreditCard}
              title="Facturación"
              description="Próximamente: gestiona tu plan, métodos de pago y historial de facturación."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsLayout>
  );
}
