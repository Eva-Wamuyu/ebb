import {  getPlatformFromUrl } from "./utils.js";
import { getSettings } from "./settings.js";

import type { BlockReason, ManagedTabSummary } from "./types.js";

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element with id "${id}".`);
  }
  return element as T;
}

function parseNumber(params: URLSearchParams, key: string, fallback: number): number {
    const parsed = Number(params.get(key));

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}


function shortenUrl(urlValue: string): string {
  try {
    const url = new URL(urlValue);
    return `${url.hostname}${url.pathname}${url.search}`;
  } catch {
    return urlValue;
  }
}

function getUniquePlatformCount(tabs: ManagedTabSummary[]): number {
  return new Set(
    tabs.map((tab) => tab.platformId)
  ).size;
}

function renderNotice(reason: BlockReason,attemptedPlatformName: string,maxPlatforms: number,maxTabsPerPlatform: number): void {
  const title = getElement("notice-title");
  const message = getElement("notice-message");
  const usage = document.createElement("strong");

  if (reason === "tab-limit") {
    title.textContent = `Make room for ${attemptedPlatformName}`;
    usage.textContent = `${maxTabsPerPlatform} of ${maxTabsPerPlatform}`;
    message.replaceChildren(`${attemptedPlatformName} is using `,usage," tab spaces. Close one of its tabs to continue.");
    return;
  }

  title.textContent = `Make room for ${attemptedPlatformName}`;
  usage.textContent = `${maxPlatforms} of ${maxPlatforms}`;
  message.replaceChildren("You are using ",usage,` platform spaces. Close the last tab from one platform to continue to ${attemptedPlatformName}.`);
}

function renderDestination(attemptedPlatformName: string,attemptedUrl: string): void {
  getElement("destination-name").textContent = attemptedPlatformName;
  const destinationUrl = getElement("destination-url");
  destinationUrl.textContent = shortenUrl(attemptedUrl);
  destinationUrl.title = attemptedUrl;
}

function renderUsage(tabs: ManagedTabSummary[],maxPlatforms: number,maxTabsPerPlatform: number): void {
  const platformCount = getUniquePlatformCount(tabs);
  const attemptedPlatform = getPlatformFromUrl(attemptedUrl);
  const attemptedPlatformTabCount = tabs.filter((tab) => tab.platformId === attemptedPlatform?.id).length;
    
  getElement("platform-usage").textContent =  `${platformCount} / ${maxPlatforms}`;
  getElement("tab-usage").textContent =  `${tabs.length} / ${maxPlatforms * maxTabsPerPlatform}`;
  getElement("attempted-platform-label").textContent = `${attemptedPlatform?.name ?? attemptedPlatformName} tabs`;
  getElement("attempted-platform-usage").textContent = `${attemptedPlatformTabCount} / ${maxTabsPerPlatform}`;
    
}

function renderTabs(tabs: ManagedTabSummary[]): void {
  const list = getElement<HTMLDivElement>("tab-list");
  const template =  getElement<HTMLTemplateElement>("tab-row-template");
   

  list.replaceChildren();

  if (tabs.length === 0) { //ideally this should not happen
    const message = document.createElement("p");
    message.textContent = "No managed social-media tabs are open.";
    list.append(message);
    return;
  }

  for (const tab of tabs) {
    const fragment = template.content.cloneNode(
      true
    ) as DocumentFragment;

    const platform = fragment.querySelector<HTMLElement>(".platform");
      
    const title = fragment.querySelector<HTMLElement>(".tab-title");
      
    const url = fragment.querySelector<HTMLElement>(".tab-url");
      
    const closeButton = fragment.querySelector<HTMLButtonElement>(".button-close");
      

    if (!platform || !title || !url || !closeButton) {
      throw new Error("Invalid tab-row template.");
    }

    platform.textContent = tab.platformName;
    title.textContent = tab.title;
    title.title = tab.title;

    url.textContent = shortenUrl(tab.url);
    url.title = tab.url;

    const tabsAfterClose = tabs.filter((managedTab) => managedTab.id !== tab.id);
    const willContinue = canOpenAttemptedDestination(tabsAfterClose);

    closeButton.textContent = willContinue ? "Close & continue" : "Close";
    closeButton.setAttribute("aria-label",willContinue ? `Close ${tab.title} on ${tab.platformName} and continue to ${attemptedPlatformName}` : `Close ${tab.title} on ${tab.platformName}`);

    if(willContinue) {
      closeButton.classList.remove("button-close");
      closeButton.classList.add("button-primary");
    }

    closeButton.addEventListener("click", async () => {
      closeButton.disabled = true;

      try {
        await chrome.tabs.remove(tab.id);

        const managedTabs = await getCurrentManagedTabs();

        if (
          canOpenAttemptedDestination(managedTabs)
        ) {
          const currentTab = await chrome.tabs.getCurrent();

          if (currentTab?.id !== undefined) {
            await chrome.tabs.update(currentTab.id,
              {
                url: attemptedUrl
              }
            );
          }

          return;
        }

        renderTabs(managedTabs);

        renderUsage(
          managedTabs,
          maxPlatforms,
          maxTabsPerPlatform
        );
      } catch (error) {
        console.error(
          `Could not close tab ${tab.id}.`,
          error
        );
        closeButton.disabled = false;
      }
    });
    list.append(fragment);
  }
}

async function getCurrentManagedTabs(): Promise<
  ManagedTabSummary[]
> {
  const tabs = await chrome.tabs.query({});

  return tabs.flatMap((tab): ManagedTabSummary[] => {
    const urlValue = tab.pendingUrl ?? tab.url;

    if (
      tab.id === undefined || !urlValue
    ) {
      return [];
    }

    const platform = getPlatformFromUrl(urlValue);

    if (!platform) {
      return [];
    }

    return [{
      id: tab.id,
      windowId: tab.windowId,
      platformId: platform.id,
      platformName: platform.name,
      title: tab.title || platform.name,
      url: urlValue
    }];
  });
}

async function closeCurrentPage(): Promise<void> {
  const currentTab = await chrome.tabs.getCurrent();

  if (currentTab?.id !== undefined) {
    await chrome.tabs.remove(currentTab.id);
  }
}

function canOpenAttemptedDestination(managedTabs: ManagedTabSummary[]): boolean {
  const attemptedPlatform = getPlatformFromUrl(attemptedUrl);

  if (!attemptedPlatform) {
    return true;
  }

  const activePlatformIds = new Set(
    managedTabs.map((tab) => tab.platformId)
  );

  const attemptedPlatformTabCount =
    managedTabs.filter(
      (tab) =>
        tab.platformId === attemptedPlatform.id
    ).length;

  const platformAlreadyActive = activePlatformIds.has(attemptedPlatform.id);

  const platformAllowed = platformAlreadyActive || activePlatformIds.size < maxPlatforms;

  const tabAllowed = attemptedPlatformTabCount < maxTabsPerPlatform;

  return platformAllowed && tabAllowed;
}

const params = new URLSearchParams(window.location.search);

const reason: BlockReason = params.get("reason") === "tab-limit"
    ? "tab-limit"
    : "platform-limit";

const attemptedPlatformName = params.get("attemptedPlatformName") ?? "This platform";

const attemptedUrl = params.get("attemptedUrl") ?? "";

let maxPlatforms = parseNumber(params, "maxPlatforms", 2);

let maxTabsPerPlatform = parseNumber(params,"maxTabsPerPlatform",2);

async function loadCurrentLimits(): Promise<void> {
  try {
    const settings = await getSettings();
    maxPlatforms = settings.maxPlatforms;
    maxTabsPerPlatform = settings.maxTabsPerPlatform;
  } catch (error) {
    console.warn("Could not read current settings; using the blocked-page limits.",error);
  }
}

async function continueIfAllowed(managedTabs: ManagedTabSummary[]): Promise<boolean> {
  if (!canOpenAttemptedDestination(managedTabs) || !attemptedUrl) {
    return false;
  }

  const currentTab = await chrome.tabs.getCurrent();

  if (currentTab?.id === undefined) {
    return false;
  }

  await chrome.tabs.update(currentTab.id, {url: attemptedUrl});
  return true;
}

async function checkAndContinue(): Promise<void> {
  const button = getElement<HTMLButtonElement>("check-and-continue");
  button.disabled = true;
  button.textContent = "Checking…";

  try {
    await loadCurrentLimits();
    const managedTabs = await getCurrentManagedTabs();

    if (await continueIfAllowed(managedTabs)) {
      return;
    }

    renderNotice(reason,attemptedPlatformName,maxPlatforms,maxTabsPerPlatform);
    renderTabs(managedTabs);
    renderUsage(managedTabs,maxPlatforms,maxTabsPerPlatform);
  } finally {
    button.disabled = false;
    button.textContent = "Check and continue";
  }
}

void initializePage();

getElement<HTMLButtonElement>("check-and-continue").addEventListener("click",() => {
  void checkAndContinue();
});

getElement<HTMLButtonElement>(
  "close-page"
).addEventListener(
  "click",
  () => {
    void closeCurrentPage();
  }
);

getElement<HTMLButtonElement>(
  "open-settings"
).addEventListener(
  "click",
  () => {
    void chrome.runtime.openOptionsPage();
  }
);

document.addEventListener("keydown", (event) => {
  if(event.key === "Escape") {
    event.preventDefault();
    void closeCurrentPage();
    return;
  }
});

async function initializePage(): Promise<void> {
  await loadCurrentLimits();
  const managedTabs = await getCurrentManagedTabs();

  if (await continueIfAllowed(managedTabs)) {
    return;
  }

  renderNotice(reason,attemptedPlatformName,maxPlatforms,maxTabsPerPlatform);
  renderDestination(attemptedPlatformName,attemptedUrl);
  renderTabs(managedTabs);
  renderUsage(managedTabs,maxPlatforms,maxTabsPerPlatform);
}
