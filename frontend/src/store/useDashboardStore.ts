import { useJobsStore } from './useJobsStore';
import { useWizardStore } from './useWizardStore';
import { useVoicesStore } from './useVoicesStore';
import { useMediaStore } from './useMediaStore';
import { useSettingsStore } from './useSettingsStore';

// Re-export specialized stores for direct consumption
export { useJobsStore } from './useJobsStore';
export { useWizardStore } from './useWizardStore';
export { useVoicesStore } from './useVoicesStore';
export { useMediaStore } from './useMediaStore';
export { useSettingsStore } from './useSettingsStore';

// Import types for combined interface
import type { JobsState } from './useJobsStore';
import type { WizardState } from './useWizardStore';
import type { VoicesState } from './useVoicesStore';
import type { MediaState } from './useMediaStore';
import type { SettingsState } from './useSettingsStore';

/**
 * Combined dashboard state — matches the original monolithic store shape.
 * Kept for backward compatibility during transition.
 * Prefer importing specialized stores directly.
 */
export type DashboardState = JobsState &
  WizardState &
  VoicesState &
  MediaState &
  SettingsState;

interface DashboardStoreHook {
  (): DashboardState;
  getState: () => DashboardState;
}

/**
 * Backward-compatible combined hook.
 * Subscribes to all 5 specialized stores and merges their state.
 */
export const useDashboardStore: DashboardStoreHook = Object.assign(
  (): DashboardState =>
    ({
      ...useJobsStore(),
      ...useWizardStore(),
      ...useVoicesStore(),
      ...useMediaStore(),
      ...useSettingsStore(),
    }) as DashboardState,
  {
    getState: (): DashboardState =>
      ({
        ...useJobsStore.getState(),
        ...useWizardStore.getState(),
        ...useVoicesStore.getState(),
        ...useMediaStore.getState(),
        ...useSettingsStore.getState(),
      }) as DashboardState,
  },
);
