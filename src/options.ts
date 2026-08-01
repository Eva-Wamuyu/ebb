import { getSettings, saveSettings } from "./settings.js";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element with id "${id}".`);
  }

  return element as T;
}

async function renderSettings(): Promise<void> {
  const settings = await getSettings();

  getElement<HTMLInputElement>("max-platforms").value =
    String(settings.maxPlatforms);

  getElement<HTMLInputElement>(
    "max-tabs-per-platform"
  ).value = String(settings.maxTabsPerPlatform);
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

  const currentSettings = await getSettings();

  const savedSettings = await saveSettings({
    ...currentSettings,
    maxPlatforms,
    maxTabsPerPlatform
  });

  getElement<HTMLInputElement>("max-platforms").value =
    String(savedSettings.maxPlatforms);

  getElement<HTMLInputElement>(
    "max-tabs-per-platform"
  ).value = String(savedSettings.maxTabsPerPlatform);

  saveStatus.textContent =
  `Limits saved: ${savedSettings.maxPlatforms} platforms, ` +
  `${savedSettings.maxTabsPerPlatform} tabs per platform.`;
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
