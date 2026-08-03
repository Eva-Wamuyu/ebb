import { platforms } from "./platforms.js";

export interface ExtensionSettings {
  maxPlatforms: number;
  maxTabsPerPlatform: number;
  platformPreferences: Record<string, boolean>;
}

const SETTINGS_KEY = "settings";

const MIN_LIMIT = 1;
const MAX_LIMIT = 4;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  maxPlatforms: 2,
  maxTabsPerPlatform: 2,
  platformPreferences: Object.fromEntries(
    platforms.map((platform) => [platform.id,true])
  )
};

function normalizeLimit(value: unknown,fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(MAX_LIMIT,Math.max(MIN_LIMIT, value));
}

function normalizePlatformPreferences(value: unknown): Record<string, boolean> {
  const stored = typeof value === "object" && value !== null
    ? value as Record<string, unknown>
    : {};

  return Object.fromEntries(
    platforms.map((platform) => [
      platform.id,
      stored[platform.id] === false ? false : true
    ])
  );
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
    ),
    platformPreferences: normalizePlatformPreferences(
      stored.platformPreferences
    )
  };
}

export function isPlatformManaged(settings: ExtensionSettings,platformId: string): boolean {
  return settings.platformPreferences[platformId] !== false;
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
