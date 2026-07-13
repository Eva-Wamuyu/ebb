import {  getPlatformFromUrl } from "./utils.js";

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

  if (reason === "tab-limit") {
    title.textContent = "Social Media Tabs Limit Reached";
    message.textContent =
      `${attemptedPlatformName} already has ` +
      `${maxTabsPerPlatform} open tabs.`;
    return;
  }

  title.textContent = "Socialmedia Platform Limit Reached";
  message.textContent =
    `${attemptedPlatformName} was not opened because ` +
    `${maxPlatforms} socialmedia platforms are already active.`;
}

function renderDestination(attemptedPlatformName: string,attemptedUrl: string): void {
  getElement("destination-name").textContent = attemptedPlatformName;
  const destinationUrl = getElement("destination-url");
  destinationUrl.textContent = shortenUrl(attemptedUrl);
  destinationUrl.title = attemptedUrl;
}

function renderUsage(tabs: ManagedTabSummary[],maxPlatforms: number,maxTabsPerPlatform: number): void {
  const platformCount = getUniquePlatformCount(tabs);
    
  getElement("platform-usage").textContent =  `${platformCount} / ${maxPlatforms}`;
  getElement("tab-usage").textContent =  `${tabs.length} / ${maxPlatforms * maxTabsPerPlatform}`;
  getElement("tabs-per-platform-limit").textContent = String(maxTabsPerPlatform);
    
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

    closeButton.setAttribute("aria-label",`Close ${tab.title} on ${tab.platformName}`);

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

async function refreshState(): Promise<void> {
  const tabs = await getCurrentManagedTabs();

  renderTabs(tabs);
  renderUsage(tabs,maxPlatforms,maxTabsPerPlatform);
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

async function checkAndContinue(): Promise<void> {
  const button = getElement<HTMLButtonElement>("check-and-continue");

  button.disabled = true;
  button.textContent = "Checking…";

  try {
    await refreshState();

    const managedTabs = await getCurrentManagedTabs();

    if (!canOpenAttemptedDestination(managedTabs)) {
      getElement("notice-message").textContent = "The limit is still active. Close another managed tab or platform first.";
      return;
    }

    const currentTab = await chrome.tabs.getCurrent();

    if (currentTab?.id === undefined) {
      return;
    }

    await chrome.tabs.update(
      currentTab.id,
      {
        url: attemptedUrl
      }
    );
  } finally {
    button.disabled = false;
    button.textContent =
      "Check and continue";
  }
}

const params = new URLSearchParams(window.location.search);

const reason: BlockReason = params.get("reason") === "tab-limit"
    ? "tab-limit"
    : "platform-limit";

const attemptedPlatformName = params.get("attemptedPlatformName") ?? "This platform";

const attemptedUrl = params.get("attemptedUrl") ?? "";

const maxPlatforms = parseNumber(params, "maxPlatforms", 2);

const maxTabsPerPlatform = parseNumber(params,"maxTabsPerPlatform",2);

void initializePage();

getElement<HTMLButtonElement>("check-and-continue").addEventListener("click",
  () => {
    void checkAndContinue();
  }
);

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
    console.log(
      "Settings are not implemented yet."
    );
  }
);

getElement<HTMLButtonElement>(
  "pause-limits"
).addEventListener(
  "click",
  () => {
    console.log(
      "Pause limits is not implemented yet."
    );
  }
);

async function initializePage(): Promise<void> {
  const managedTabs = await getCurrentManagedTabs();

  if (canOpenAttemptedDestination(managedTabs) && attemptedUrl) {
    const currentTab = await chrome.tabs.getCurrent();

    if (currentTab?.id !== undefined) {
      await chrome.tabs.update(currentTab.id, {
        url: attemptedUrl
      });
    }
    return;
  }

  renderNotice(reason,attemptedPlatformName,maxPlatforms,maxTabsPerPlatform);
  renderDestination(attemptedPlatformName,attemptedUrl);
  renderTabs(managedTabs);
  renderUsage(managedTabs,maxPlatforms,maxTabsPerPlatform);
}