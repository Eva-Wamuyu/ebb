# Ebb

![Ebb logo](images/icon-128.png)

Ebb is a Chrome extension for limiting how many social-media contexts stay open at once. You choose a maximum number of active platforms and a maximum number of tabs per platform.

Ebb does not track time, score your browsing or send usage data anywhere.

## How it works

Suppose your settings allow two platforms and two tabs per platform:

- Two Twitter tabs and two Reddit tabs are allowed.
- A third Twitter tab opens Ebb's context page.
- Opening Instagram while Twitter and Reddit are active also opens the context page.

The context page keeps the requested destination available and shows the managed tabs that are already open. A **Close & continue** action closes the selected tab and opens the requested destination. A plain **Close** action closes a tab that does not yet make enough room.

Ebb does not close a managed social-media tab until you select its close action.

## Settings

Select the Ebb toolbar icon to open Settings.

You can change:

- Active platform limit: 1-4.
- Tabs per platform: 1-4.
- Sites included in Ebb.

A site that is not included does not count toward either limit. All sites in the current registry are included by default.

## Supported sites

- YouTube
- X (Twitter)
- Reddit
- LinkedIn
- Instagram
- Facebook
- Threads
- TikTok
- Pinterest
- Truth Social
- Snapchat
- Discord
- Bluesky
- Telegram
- WhatsApp
- Messenger
- Tumblr
- Mastodon Social and Mastodon Online
- Quora
- Medium
- Substack
- Nextdoor

The registry lives in [`src/platforms.ts`](src/platforms.ts).

## Privacy

Ebb checks the URLs and titles of open tabs so it can identify supported sites and apply your settings. That activity happens in the browser. Ebb does not send tab data to the developer or another service.

See [PRIVACY.md](PRIVACY.md) for details.

## Permissions

Ebb asks for two Chrome permissions:

- `tabs` — identify open supported sites, show them on the context page, and close a tab after the user selects a close action.
- `storage` — save limits and included-site choices in Chrome's local extension storage.

## Install for local development

Requirements:

- Node.js
- pnpm 10.28.2

Install dependencies and build the extension:

```sh
pnpm install
pnpm build
```

Load it in Chrome:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository folder.

Reload the extension from `chrome://extensions` after rebuilding it.

## Development commands

```sh
pnpm build
pnpm watch
```

## Project layout

```text
src/             TypeScript source
dist/            Compiled extension scripts
images/          Ebb logo and Chrome icon sizes
blocked.html     Context page shown when a limit is reached
options.html     Settings page
style.css        Shared page styles
manifest.json    Chrome extension manifest
PRIVACY.md       Privacy policy
```

## License

Ebb is available under the [MIT License](LICENSE).
