export interface ExtensionSettings {
  maxPlatforms: number;
  maxTabsPerPlatform: number;
}

const SETTINGS_KEY = "settings";

const MIN_LIMIT = 1;
const MAX_LIMIT = 4;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  maxPlatforms: 2,
  maxTabsPerPlatform: 2
};

function normalizeLimit(value: unknown,fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(MAX_LIMIT,Math.max(MIN_LIMIT, value));
}

function normalizeSettings(value: unknown): ExtensionSettings {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_SETTINGS };
  }

  const stored = value as Partial<ExtensionSettings>;

  return {
    maxPlatforms: normalizeLimit(
      stored.maxPlatforms,
      DEFAULT_SETTINGS.maxPlatforms
    ),
    maxTabsPerPlatform: normalizeLimit(
      stored.maxTabsPerPlatform,
      DEFAULT_SETTINGS.maxTabsPerPlatform
    )
  };
}

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);

  return normalizeSettings(result[SETTINGS_KEY]);
}

export async function saveSettings(settings: ExtensionSettings): Promise<ExtensionSettings> {
  const normalized = normalizeSettings(settings);

  await chrome.storage.local.set({[SETTINGS_KEY]: normalized});

  return normalized;
}
