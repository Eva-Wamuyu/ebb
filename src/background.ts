import { findPlatformByDomain } from "./platforms.js";
import { getDomain, getTabPlatform } from "./utils.js";
import { BlockReason, PlatformSummary, Platform, ManagedTabSummary } from "./types.js";

const MAX_PLATFORMS = 2;
const MAX_TABS_PER_PLATFORM = 2;


function getPlatformTabs(managedTabs: chrome.tabs.Tab[], platform: Platform): chrome.tabs.Tab[]{
    return managedTabs.filter((tab) => {
      return getTabPlatform(tab)?.id === platform.id;
   });
}

async function getManagedTabs(): Promise<chrome.tabs.Tab[]>{
    const tabs = await chrome.tabs.query({});

    return tabs.filter((tab) => {
        return getTabPlatform(tab) !== undefined;
    })
}

function getActivePlatforms(managedTabs: chrome.tabs.Tab[]): Platform[]{
    const activePlatforms = new Map<string, Platform>();

    for(const tab of managedTabs){
        const platform = getTabPlatform(tab);

        if(platform) {
            activePlatforms.set(platform.id, platform)
        }
    }
    return [...activePlatforms.values()];
}

function getManagedTabSummaries(managedTabs: chrome.tabs.Tab[]): ManagedTabSummary[]{
  return managedTabs.flatMap((tab)=> {
    const platform = getTabPlatform(tab);
    const urlVal = tab.pendingUrl ?? tab.url;

    if(tab.id === undefined || !platform || !urlVal){
      return [];
    }

    return [{
      id: tab.id,
      windowId: tab.windowId,
      platformId: platform.id,
      platformName: platform.name,
      title: tab.title || platform.name,
      url: urlVal
    }]
  })
}

async function showBlockedPage(attemptedTabId: number, attemptedPlatform: Platform,attemptedUrl: string, reason: BlockReason, existingManagedTabs: chrome.tabs.Tab[]): Promise<void>{
    const blockedPageBaseUrl = chrome.runtime.getURL("./blocked.html");

    const activePlatforms = getActivePlatforms(existingManagedTabs);

    const platformSummaries: PlatformSummary[] = activePlatforms.map(
        (platform) => ({
        id: platform.id,
        name: platform.name,
        tabCount: getPlatformTabs(existingManagedTabs, platform).length
        })
    );

    const managedTabSummaries = getManagedTabSummaries(existingManagedTabs);

    const params = new URLSearchParams({
        reason,
        attemptedPlatformId: attemptedPlatform.id,
        attemptedPlatformName: attemptedPlatform.name,
        attemptedUrl,
        maxPlatforms: String(MAX_PLATFORMS),
        maxTabsPerPlatform: String(MAX_TABS_PER_PLATFORM),
        activePlatforms: JSON.stringify(platformSummaries),
        managedTabs: JSON.stringify(managedTabSummaries)
    });

    const blockedPageUrl = `${blockedPageBaseUrl}?${params.toString()}`;

    const tabs = await chrome.tabs.query({});

    const existingBlockedTab = tabs.find((tab) => {
        return (
            tab.id !== undefined && tab.id !== attemptedTabId && tab.url?.startsWith(blockedPageBaseUrl)
        );
    })

    //blocking page for monofeed exists so close to shift to new tab
    if(existingBlockedTab?.id !== undefined) {
        await closeTab(existingBlockedTab.id);
    }
    //new monofeed tab. Convert the attempted tab into the blocked page
    await chrome.tabs.update(attemptedTabId, {
        url: blockedPageUrl,
        active: true
    });
}

async function handleNavigation(tabId: number, urlValue: string): Promise<void> {
  const domain = getDomain(urlValue);
  if (!domain) {
    return;
  }
  const platform = findPlatformByDomain(domain);
  if (!platform) {
    console.log(`Tab ${tabId}: ${domain} is unmanaged.`);
    return;
  }
  const managedTabs = await getManagedTabs();

  const existingManagedTabs = managedTabs.filter(
    (tab) => tab.id !== tabId
  );

  const existingPlatformTabs = getPlatformTabs(
    existingManagedTabs,
    platform
  );

    const existingActivePlatforms = getActivePlatforms(
        existingManagedTabs
    );

    const platformAlreadyActive = existingActivePlatforms.some(
        (activePlatform) => activePlatform.id === platform.id
    );

   console.log("Monofeed state:", {
    currentPlatform: platform.name,
    platformTabs: existingPlatformTabs.length,
    activePlatforms: existingActivePlatforms.map(
      (activePlatform) => activePlatform.name
    ),
    platformLimit: MAX_PLATFORMS,
    tabLimit: MAX_TABS_PER_PLATFORM
  });

  //blocking new extra platform - 3rd in v1
  if(!platformAlreadyActive && existingActivePlatforms.length >= MAX_PLATFORMS){
    console.warn(`Closing tab ${tabId}: ${platform.name} would exceed the ${MAX_PLATFORMS}-platform limit`);

    // await closeTab(tabId);
    await showBlockedPage(tabId, platform,urlValue,"platform-limit",existingManagedTabs);
    return;
  }

  //blocking a third tab for an already exsiting platform
  if (existingPlatformTabs.length >= MAX_TABS_PER_PLATFORM) {
    console.warn(`Closing tab ${tabId}: ${platform.name} exceeded the ${MAX_TABS_PER_PLATFORM}-tab limit`);
    await showBlockedPage(tabId, platform,urlValue, "tab-limit", existingManagedTabs);
    // await closeTab(tabId)
  }

}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
async function closeTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.warn(`Could not close tab ${tabId} immediately. Retrying.`, error);

    await delay(150);

    try {
      await chrome.tabs.remove(tabId);
    } catch (retryError) {
      console.error(`Failed to close tab ${tabId}.`, retryError);
    }
  }
}


chrome.runtime.onInstalled.addListener(() => {
    console.log("Monofeed installed.");
});

chrome.tabs.onCreated.addListener((tab) => {
    const urlValue = tab.pendingUrl ?? tab.url;
    if (!urlValue || tab.id === undefined) {
        return;
    }
    void handleNavigation(tab.id, urlValue);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!changeInfo.url) {
        return;
    }
    void handleNavigation(tabId, changeInfo.url);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);

  const urlValue = tab.url ?? tab.pendingUrl;

  if (!urlValue) {
    return;
  }
//   await handleNavigation(tabId, urlValue);
});