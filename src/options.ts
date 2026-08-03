import { getSettings, saveSettings } from "./settings.js";
import { platforms } from "./platforms.js";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element with id "${id}".`);
  }

  return element as T;
}

function renderPlatformPreferences(platformPreferences: Record<string, boolean>): void {
  const list = getElement<HTMLDivElement>("platform-list");
  list.replaceChildren();

  for(const platform of platforms) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const name = document.createElement("span");

    label.className = "platform-toggle";
    checkbox.id = `platform-${platform.id}`;
    checkbox.type = "checkbox";
    checkbox.checked = platformPreferences[platform.id] !== false;
    name.textContent = platform.name;

    label.append(checkbox,name);
    list.append(label);
  }
}

async function renderSettings(): Promise<void> {
  const settings = await getSettings();

  getElement<HTMLInputElement>("max-platforms").value =
    String(settings.maxPlatforms);

  getElement<HTMLInputElement>(
    "max-tabs-per-platform"
  ).value = String(settings.maxTabsPerPlatform);

  renderPlatformPreferences(settings.platformPreferences);
}

async function saveForm(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  const saveStatus = getElement("save-status");

  const maxPlatforms = Number(
    getElement<HTMLInputElement>("max-platforms").value
  );

  const maxTabsPerPlatform = Number(
    getElement<HTMLInputElement>(
      "max-tabs-per-platform"
    ).value
  );

  const platformPreferences = Object.fromEntries(
    platforms.map((platform) => [
      platform.id,
      getElement<HTMLInputElement>(`platform-${platform.id}`).checked
    ])
  );

  const currentSettings = await getSettings();

  const savedSettings = await saveSettings({
    ...currentSettings,
    maxPlatforms,
    maxTabsPerPlatform,
    platformPreferences
  });

  getElement<HTMLInputElement>("max-platforms").value =
    String(savedSettings.maxPlatforms);

  getElement<HTMLInputElement>(
    "max-tabs-per-platform"
  ).value = String(savedSettings.maxTabsPerPlatform);

  renderPlatformPreferences(savedSettings.platformPreferences);

  const managedPlatformCount = Object.values(savedSettings.platformPreferences).filter(Boolean).length;

  saveStatus.textContent =
  `Limits saved: ${savedSettings.maxPlatforms} platforms, ` +
  `${savedSettings.maxTabsPerPlatform} tabs per platform, ` +
  `${managedPlatformCount} managed sites.`;
}

getElement<HTMLFormElement>(
  "settings-form"
).addEventListener("submit", (event) => {
  void saveForm(event);
});

async function closeSettingsPage(): Promise<void> {
  const currentTab = await chrome.tabs.getCurrent();

  if (currentTab?.id !== undefined) {
    await chrome.tabs.remove(currentTab.id);
  }
}

getElement<HTMLButtonElement>(
  "close-settings"
).addEventListener("click", () => {
  void closeSettingsPage();
});

void renderSettings();
