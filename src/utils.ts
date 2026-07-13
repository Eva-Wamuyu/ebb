import { findPlatformByDomain } from "./platforms.js";
import { Platform } from "./types.js";

export function getDomain(urlValue: string): string | null {
  try {
    return new URL(urlValue).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getPlatformFromUrl(
  urlValue: string
): Platform | undefined {
  const domain = getDomain(urlValue);
  if (!domain) {
    return undefined;
  }
  return findPlatformByDomain(domain);
}

export function getTabPlatform(tab: chrome.tabs.Tab): Platform | undefined {
  const urlValue = tab.pendingUrl ?? tab.url;

  if (!urlValue) {
    return undefined;
  }

  const domain = getDomain(urlValue);

  if (!domain) {
    return undefined;
  }

  return findPlatformByDomain(domain);
}
