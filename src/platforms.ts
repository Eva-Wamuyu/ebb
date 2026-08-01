import { Platform } from "./types";


export const platforms: Platform[] = [
    {
        id: "youtube",
        name: "YouTube",
        domains: [
            "youtube.com",
            "m.youtube.com"
        ]
    },
    {
        id: "x",
        name: "X (Twitter)",
        domains: [
            "x.com",
            "twitter.com",
            "mobile.twitter.com"
        ]
    },
    {
        id: "reddit",
        name: "Reddit",
        domains: [
            "reddit.com",
            "old.reddit.com",
            "new.reddit.com"
        ]
    },
    {
        id: "linkedin",
        name: "LinkedIn",
        domains: [
            "linkedin.com"
        ]
    },
    {
        id: "instagram",
        name: "Instagram",
        domains: [
            "instagram.com"
        ]
    },
    {
        id: "facebook",
        name: "Facebook",
        domains: [
            "facebook.com",
            "m.facebook.com"
        ]
    },
    {
        id: "threads",
        name: "Threads",
        domains: [
            "threads.net"
        ]
    },
    {
        id: "tiktok",
        name: "TikTok",
        domains: [
            "tiktok.com"
        ]
    },
    {
        id: "pinterest",
        name: "Pinterest",
        domains: [
            "pinterest.com"
        ]
    },
    {
        id: "truth-social",
        name: "Truth Social",
        domains: [
            "truthsocial.com"
        ]
    },
    {
        id: "snapchat",
        name: "Snapchat",
        domains: [
            "snapchat.com"
        ]
    },
    {
        id: "discord",
        name: "Discord",
        domains: [
            "discord.com"
        ]
    },
    {
        id: "bluesky",
        name: "Bluesky",
        domains: [
            "bsky.app"
        ]
    },
    {
        id: "telegram",
        name: "Telegram",
        domains: [
            "web.telegram.org"
        ]
    },
    {
        id: "whatsapp",
        name: "WhatsApp",
        domains: [
            "web.whatsapp.com"
        ]
    },
    {
        id: "messenger",
        name: "Messenger",
        domains: [
            "messenger.com"
        ]
    },
    {
        id: "tumblr",
        name: "Tumblr",
        domains: [
            "tumblr.com"
        ]
    },
    {
        id: "mastodon",
        name: "Mastodon",
        domains: [
            "mastodon.social",
            "mastodon.online"
        ]
    },
    {
        id: "quora",
        name: "Quora",
        domains: [
            "quora.com"
        ]
    },
    {
        id: "medium",
        name: "Medium",
        domains: [
            "medium.com"
        ]
    },
    {
        id: "substack",
        name: "Substack",
        domains: [
            "substack.com"
        ]
    },
    {
        id: "nextdoor",
        name: "Nextdoor",
        domains: [
            "nextdoor.com"
        ]
    },
];

export function findPlatformByDomain(domain: string): Platform | undefined {
    return platforms.find((platform) =>
        platform.domains.includes(domain)
    );
}