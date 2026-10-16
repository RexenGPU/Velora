<p align="center">
  <img src="src/assets/logo.png" width="120" alt="Velora logo" />
</p>

<h1 align="center">Velora</h1>

<p align="center">
  <strong>A calm, privacy-first browser & start page.</strong><br/>
  Local-first. No accounts. No analytics. Your data stays on your device.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Electron-44-47848f?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/tests-60%20passing-2ea44f" alt="60 tests passing" />
  <img src="https://img.shields.io/badge/license-MIT-8b5cf6" alt="MIT license" />
</p>

---

Velora is a desktop browser and web start page built around one idea: **your browsing belongs to you**. It combines a polished, Zen-style vertical tab interface with an honest privacy toolkit — an encrypted local password vault, a URL-based website inspector, and clear explanations of what is (and isn't) being tracked. No account, no server, no telemetry.

## The desktop browser

- **Zen-style vertical tabs** — a slim 46 px sidebar that expands smoothly on hover (210 px) with per-site favicons, colored letter-tile fallbacks, and spring-eased enter animations. The content always adapts — nothing is ever covered.
- **One unified top bar** — brand on the dashboard; back / forward / reload / home, a colored HTTPS indicator with the site's hostname, and "open in system browser" on external pages. Window controls always on the right.
- **Real address bar** — type a query to search, or a web address to open it directly. Enter opens results in a **new tab**; the dashboard stays mounted underneath.
- **Keyboard shortcuts** — `Ctrl+T` new tab · `Ctrl+W` close tab · `Ctrl+Tab` cycle tabs · `/`, `Ctrl+K`, `Ctrl+L` focus search · `Esc` close dialogs.
- **Configurable startup** — launch on the dashboard or open any custom page in a tab.
- **Resilient packaging** — window icons are read from outside the asar, and first-run load failures (antivirus scans, slow disks) are retried automatically.

## The start page

- **Live clock** with seconds tinted in your accent color, greeting and date — or hide it entirely.
- **Search engine selection** — DuckDuckGo, Brave, Startpage, Mojeek, Google, **or your own custom engine** (any URL template with a `%s` placeholder).
- **Quick links** — add, edit, remove, categorize and reorder shortcuts. Real site logos (DuckDuckGo icon service, toggleable) with letter-tile fallbacks. JSON import/export included.
- **Optional history** — **off by default**. When enabled, stays local, capped at 500 entries, grouped by day, excluded from backups, clearable anytime.
- **Dark / light / system themes**, six accent colors, comfortable or compact density.

## 🔐 The password vault

- **AES-GCM 256-bit encryption**, key derived with PBKDF2-SHA256 (310,000 iterations).
- The **master password is never stored** — it exists only in memory while the vault is unlocked, and is dropped on reload.
- Store name, website, username, password and encrypted notes per entry.
- **Built-in password generator** (12–24 chars, cryptographic randomness).
- **Clear-text export** with an explicit warning dialog — for migrating to other managers.
- **Opt-in auto-login** — per entry, while the vault is unlocked, Velora fills and submits matching login forms.
- **Survives version upgrades** — the store is mirrored to `velora-store.json` in the app's data folder on every change; renderer storage can be wiped between releases without losing anything.

> ⚠️ A forgotten master password cannot be recovered — not by you, not by anyone. Export regularly.

## The privacy toolkit

- **Website inspector** — enter a URL and see what's observable from the address itself: HTTPS status, tracking parameters (with a one-click cleaned URL), matches against a transparent tracker reference list (~60 well-known domains), punycode and private-address warnings. Velora contacts nothing — and it clearly separates verified observations from what a web page can *never* see cross-origin.
- **Privacy checklist** — per-browser settings paths (Firefox, Chrome, Edge, Safari), GPC, secure DNS, third-party cookies — with progress stored locally.
- **Education panels** — third-party cookies explained, private browsing vs. tracking protection, reputable resources (EFF, Privacy Guides, Have I Been Pwned…).

## Privacy architecture

- **No account, no server.** Nothing is sent to Velora — there is no Velora server.
- **No analytics, no third-party scripts.** Fonts are self-hosted; no external APIs are called at startup.
- **Only two things ever leave your device**: search queries (sent directly to your chosen engine — Velora does not proxy or anonymize them) and normal requests when you open links. Optional site icons additionally contact DuckDuckGo's icon service; the toggle turns it off completely.
- **Restrictive CSP** in production builds (`default-src 'none'`, same-origin scripts and fonts only).
- **Safe rendering** — user content never injected as raw HTML; all URLs validated (http/https only).
- localStorage is **not encrypted** — which is why the vault encrypts everything itself, and why you shouldn't store secrets outside it.

## Getting started

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev        # web dashboard on localhost:5173
npm test           # 60 unit tests
npm run build      # type-check + production web build into dist/
npm run preview    # serve the production build
```

### Build the desktop app

```bash
npm run dist
```

Generates in `release/`:
- `Velora-Setup-1.6.0.exe` — NSIS installer (Start-menu shortcut, uninstall entry)
- `Velora-1.6.0-portable.exe` — standalone portable executable

> The app icon is generated from `src/assets/logo.png`. Drop your own image at that path and run `npm run icon` to rebrand everything (window icon, favicon, sidebar, installer).

### Deploy the web version

The build is a static site with relative paths — works from any base URL. The included GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys `dist/` to GitHub Pages on every push to `main` (enable **Settings → Pages → Source: GitHub Actions**).

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `/` · `Ctrl+K` · `Ctrl+L` | Focus the search bar |
| `Enter` | Search, or open the typed address in a new tab |
| `Ctrl+T` | New tab (engine homepage) |
| `Ctrl+W` | Close tab |
| `Ctrl+Tab` | Cycle tabs |
| `Esc` | Close dialogs and menus |

## Project structure

```
src/
  components/        # reusable UI (Logo, Header, ui/*, AutoLoginBridge)
  features/
    dashboard/       # Clock, SearchBar wiring, PrivacyOverview, LocalDataPanel
    search/          # Address-bar-style search
    favorites/        # Quick links grid, forms, import/export
    privacy/         # Inspector, tools, checklist, education panels
    vault/           # Encrypted password vault
    history/         # Opt-in local history
    settings/        # Settings slide-over
  hooks/  lib/  types/  styles/
electron/
  main.js            # Tab manager, sidebar/titlebar views, IPC, auto-login
  preload.cjs        # App bridge (store persistence, autologin, window controls)
  chrome-preload.cjs # Chrome views bridge (tabs, nav, window controls)
  sidebar.html       # Zen-style tab sidebar
  titlebar.html      # Unified top bar
scripts/             # make-icon, CDP end-to-end test suites
```

## Contributing

PRs welcome. Run `npm test` and `npm run build` before submitting; E2E scripts for the desktop shell live in `scripts/` and use Chrome DevTools Protocol.

## License

[MIT](LICENSE) — © Velora contributors
