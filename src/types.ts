export type BlockReason = "platform-limit" | "tab-limit";

export interface Platform {
    id: string;
    name: string;
    domains: string[];
}

export interface PlatformSummary {
  id: string;
  name: string;
  tabCount: number;
}

export interface ManagedTabSummary {
  id: number,
  windowId: number,
  platformId: string,
  platformName: string,
  title: string,
  url: string
}