import { app, BrowserWindow, ipcMain, session, shell, WebContentsView } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, '..', 'dist')

// Prefer the icon copied next to the asar (extraResources) — reading icons from
// inside an asar can fail on Windows and fall back to a generic Electron icon.
const packagedIcon = path.join(process.resourcesPath, 'icon.ico')
const devIcon = path.join(__dirname, '..', 'build', 'icon.ico')
const iconPath = fs.existsSync(packagedIcon) ? packagedIcon : devIcon

const storePath = path.join(app.getPath('userData'), 'velora-store.json')

const TITLEBAR_H = 36
const SIDEBAR_W = 46
const SIDEBAR_W_EXPANDED = 210

const ENGINE_HOMES = {
  duckduckgo: 'https://duckduckgo.com/',
  brave: 'https://search.brave.com/',
  startpage: 'https://www.startpage.com/',
  mojeek: 'https://www.mojeek.com/',
  google: 'https://www.google.com/',
}

let win = null
let titlebarView = null
let sidebarView = null
let tabSeq = 0
let activeTab = 'home'
let sidebarWidth = SIDEBAR_W
let sidebarAnim = null
/** id -> { view, url, title, loading, spaceId, blocked, wcId } */
const tabViews = new Map()
/** webContents id -> tab id (for request counting) */
const wcToTab = new Map()

/* Opt-in request blocking */
let blockTrackers = false
let blockTotal = 0
let trackerDomains = []

/* Downloads (session-only, never persisted) */
const downloads = []
const downloadItems = new Map()
let downloadSeq = 0
let lastDownloadBroadcast = 0

/* Auto-update */
let updater = null

/* ---------- helpers ---------- */

function readStoreFile() {
  try {
    return fs.readFileSync(storePath, 'utf8').replace(/^\uFEFF/, '')
  } catch {
    return null
  }
}

function readStoreSettings() {
  try {
    const raw = readStoreFile()
    const d = raw ? JSON.parse(raw) : null
    return d?.settings ?? {}
  } catch {
    return {}
  }
}

function loadTrackerDomains() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'shared', 'trackers.json'), 'utf8')
    const list = JSON.parse(raw)
    trackerDomains = Array.isArray(list) ? list.map((t) => String(t.domain)).filter(Boolean) : []
  } catch {
    trackerDomains = []
  }
}

function isTrackerHost(host) {
  const h = host.toLowerCase()
  for (const domain of trackerDomains) {
    if (h === domain || h.endsWith('.' + domain)) return true
  }
  return false
}

function engineHomeUrl() {
  const s = readStoreSettings()
  if (s.engine === 'custom' && typeof s.customEngine?.urlTemplate === 'string') {
    try {
      return new URL(s.customEngine.urlTemplate.split('%s')[0]).origin + '/'
    } catch {
      // fall through
    }
  }
  return ENGINE_HOMES[s.engine] ?? ENGINE_HOMES.duckduckgo
}

function isValidExternalUrl(raw) {
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function isAppUrl(url) {
  return url.startsWith('file://')
}

function hostOf(url) {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/* ---------- settings reconciliation (opt-in blocking) ---------- */

function applyStoreSettings(json) {
  let s = {}
  try {
    s = JSON.parse(String(json).replace(/^\uFEFF/, ''))?.settings ?? {}
  } catch {
    return
  }
  blockTrackers = s.blockTrackers === true
}

/* ---------- opt-in request blocking ---------- */

function setupBlocking() {
  loadTrackerDomains()
  const blockTypes = new Set(['script', 'image', 'xhr', 'subFrame', 'media', 'stylesheet', 'font', 'ping', 'other', 'cspReport'])
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      if (!blockTrackers || details.resourceType === 'mainFrame' || !blockTypes.has(details.resourceType)) {
        callback({})
        return
      }
      const host = hostOf(details.url)
      if (host && isTrackerHost(host)) {
        blockTotal += 1
        const tabId = wcToTab.get(details.webContentsId)
        const tab = tabId !== undefined ? tabViews.get(tabId) : null
        if (tab) {
          tab.blocked = (tab.blocked ?? 0) + 1
          scheduleNavState()
        }
        callback({ cancel: true })
        return
      }
      callback({})
    },
  )
}

let navStateTimer = null
function scheduleNavState() {
  if (navStateTimer) return
  navStateTimer = setTimeout(() => {
    navStateTimer = null
    pushNavState()
  }, 250)
}

/* ---------- downloads ---------- */

function safeFilename(name) {
  const base = String(name || 'download').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim()
  return (base || 'download').slice(0, 180)
}

function uniquePath(dir, filename) {
  let candidate = path.join(dir, filename)
  if (!fs.existsSync(candidate)) return candidate
  const ext = path.extname(filename)
  const base = filename.slice(0, filename.length - ext.length)
  for (let i = 1; i < 1000; i++) {
    candidate = path.join(dir, `${base} (${i})${ext}`)
    if (!fs.existsSync(candidate)) return candidate
  }
  return path.join(dir, `${base}-${Date.now()}${ext}`)
}

function setupDownloads() {
  session.defaultSession.on('will-download', (_event, item) => {
    const filename = safeFilename(item.getFilename())
    const savePath = uniquePath(app.getPath('downloads'), filename)
    item.setSavePath(savePath)

    const id = ++downloadSeq
    const entry = {
      id,
      filename,
      host: hostOf(item.getURL()),
      total: item.getTotalBytes(),
      received: 0,
      state: 'progressing',
      savePath,
      startedAt: Date.now(),
    }
    downloads.unshift(entry)
    if (downloads.length > 60) downloads.length = 60
    downloadItems.set(id, item)

    item.on('updated', () => {
      entry.received = item.getReceivedBytes()
      entry.total = item.getTotalBytes()
      broadcastDownloads(false)
    })
    item.on('done', (_e, state) => {
      entry.state = state
      entry.received = item.getReceivedBytes()
      entry.total = item.getTotalBytes()
      downloadItems.delete(id)
      broadcastDownloads(true)
    })

    broadcastDownloads(true)
  })
}

function cleanedDownloads() {
  return downloads.map((d) => ({
    id: d.id,
    filename: d.filename,
    host: d.host,
    received: d.received,
    total: d.total,
    state: d.state,
  }))
}

function broadcastDownloads(force) {
  if (!sidebarView) return
  const now = Date.now()
  if (!force && now - lastDownloadBroadcast < 250) return
  lastDownloadBroadcast = now
  sidebarView.webContents.send('downloads:changed', cleanedDownloads())
}

/* ---------- auto-update ---------- */

async function setupUpdater() {
  if (!app.isPackaged) return
  try {
    const mod = await import('electron-updater')
    const autoUpdater = mod.autoUpdater ?? mod.default?.autoUpdater
    if (!autoUpdater) return
    updater = autoUpdater
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    const forward = (payload) => {
      titlebarView?.webContents.send('update:status', payload)
      sidebarView?.webContents.send('update:status', payload)
      if (win && !win.isDestroyed()) win.webContents.send('update:status', payload)
    }
    autoUpdater.on('checking-for-update', () => forward({ status: 'checking' }))
    autoUpdater.on('update-available', (info) => forward({ status: 'available', version: String(info?.version ?? '') }))
    autoUpdater.on('update-not-available', () => forward({ status: 'none' }))
    autoUpdater.on('download-progress', (p) => forward({ status: 'downloading', percent: Math.round(p?.percent ?? 0) }))
    autoUpdater.on('update-downloaded', (info) => forward({ status: 'downloaded', version: String(info?.version ?? '') }))
    autoUpdater.on('error', () => forward({ status: 'error' }))

    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 4000)
  } catch {
    // Updates are best-effort and never block the app.
  }
}

ipcMain.handle('update:check', async () => {
  if (!updater) return { ok: false, reason: 'unavailable' }
  try {
    await updater.checkForUpdates()
    return { ok: true }
  } catch {
    return { ok: false }
  }
})

ipcMain.on('update:install', () => {
  try {
    updater?.quitAndInstall()
  } catch {
    // ignore
  }
})

/* ---------- layout ---------- */

function layout() {
  if (!win) return
  const [w, h] = win.getContentSize()
  titlebarView.setBounds({ x: 0, y: 0, width: w, height: TITLEBAR_H })
  sidebarView.setBounds({ x: 0, y: TITLEBAR_H, width: sidebarWidth, height: h - TITLEBAR_H })

  // Content always starts after the sidebar — nothing is ever covered.
  const shown = activeTab === 'home' ? null : tabViews.get(activeTab)
  for (const entry of tabViews.values()) {
    if (entry === shown) {
      entry.view.setBounds({
        x: sidebarWidth,
        y: TITLEBAR_H,
        width: w - sidebarWidth,
        height: h - TITLEBAR_H,
      })
    } else {
      entry.view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
  }
}

/** Zen-style hover expansion: time-based eased animation (immune to timer jitter). */
function animateSidebar(expanded) {
  const target = expanded ? SIDEBAR_W_EXPANDED : SIDEBAR_W
  if (sidebarWidth === target) return
  if (sidebarAnim) clearInterval(sidebarAnim)
  const from = sidebarWidth
  const duration = 200
  const start = Date.now()
  sidebarAnim = setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    sidebarWidth = Math.round(from + (target - from) * eased)
    layout()
    // Home is the base view — keep its padding in lock-step with the bounds.
    win?.webContents.send('chrome:layout', { sidebarWidth })
    if (t >= 1) {
      clearInterval(sidebarAnim)
      sidebarAnim = null
      sidebarWidth = target
      layout()
    }
  }, 8)
}

function broadcastTabs() {
  if (!sidebarView) return
  const showIcons = readStoreSettings().showSiteIcons !== false
  const list = [{ id: 'home', title: 'Velora', active: activeTab === 'home', home: true }]
  for (const [id, t] of tabViews) {
    const host = hostOf(t.url)
    list.push({
      id: String(id),
      title: t.title || host,
      url: t.url,
      active: activeTab === id,
      loading: !!t.loading,
      favicon: showIcons && host ? `https://icons.duckduckgo.com/ip3/${host}.ico` : null,
    })
  }
  sidebarView.webContents.send('tabs:changed', list)
}

function pushNavState() {
  if (!titlebarView) return
  if (activeTab === 'home') {
    titlebarView.webContents.send('nav:state', {
      url: '',
      canGoBack: false,
      canGoForward: false,
      blocked: 0,
      maximized: win?.isMaximized() ?? false,
    })
    return
  }
  const t = tabViews.get(activeTab)
  if (!t) return
  const wc = t.view.webContents
  titlebarView.webContents.send('nav:state', {
    // Prefer the URL we tracked ourselves — getURL() can briefly be empty
    // while a view's navigation is still settling.
    url: t.url || wc.getURL(),
    canGoBack: wc.navigationHistory.canGoBack(),
    canGoForward: wc.navigationHistory.canGoForward(),
    blocked: t.blocked ?? 0,
    maximized: win?.isMaximized() ?? false,
  })
}

/* ---------- tabs ---------- */

function activateTab(id) {
  activeTab = id
  layout()
  broadcastTabs()
  pushNavState()
}

function closeTab(id) {
  const t = tabViews.get(id)
  if (!t) return
  tabViews.delete(id)
  wcToTab.delete(t.wcId)
  try {
    win.contentView.removeChildView(t.view)
    if (!t.view.webContents.isDestroyed()) t.view.webContents.close()
  } catch {
    // ignore
  }

  if (activeTab === id) {
    // Prefer another open tab, else the dashboard.
    let next = 'home'
    for (const otherId of tabViews.keys()) {
      next = otherId
      break
    }
    activeTab = next
    layout()
    broadcastTabs()
    pushNavState()
  } else {
    broadcastTabs()
  }
}

function closeActiveTab() {
  if (activeTab !== 'home') closeTab(activeTab)
}

function cycleTab(direction) {
  const ids = ['home', ...[...tabViews.keys()].map(String)]
  if (ids.length < 2) return
  const idx = ids.indexOf(String(activeTab))
  const next = ids[(idx + direction + ids.length) % ids.length]
  activateTab(next)
}

function createTab(url, focus = true) {
  if (!win || !isValidExternalUrl(url)) return null
  const id = ++tabSeq
  const view = new WebContentsView({
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  const entry = {
    view,
    url,
    title: hostOf(url),
    loading: true,
    blocked: 0,
    wcId: view.webContents.id,
  }
  tabViews.set(id, entry)
  wcToTab.set(entry.wcId, id)

  // Keep chrome views always on top: tab views go below them.
  win.contentView.addChildView(view, 0)

  view.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isValidExternalUrl(target)) createTab(target)
    return { action: 'deny' }
  })

  view.webContents.on('page-title-updated', (_e, title) => {
    entry.title = title
    broadcastTabs()
  })
  view.webContents.on('did-navigate', (_e, target) => {
    entry.url = target
    entry.blocked = 0
    broadcastTabs()
    pushNavState()
    requestAutologin(id, target)
  })
  view.webContents.on('did-navigate-in-page', () => {
    broadcastTabs()
    pushNavState()
  })
  view.webContents.on('did-finish-load', () => {
    entry.loading = false
    broadcastTabs()
    requestAutologin(id, view.webContents.getURL())
  })
  view.webContents.on('did-fail-load', (_e, _code, _desc, _url, isMainFrame) => {
    if (isMainFrame) {
      entry.loading = false
      broadcastTabs()
    }
  })
  bindShortcuts(view.webContents)

  void view.webContents.loadURL(url).catch(() => {})
  if (focus) activateTab(id)
  else broadcastTabs()
  layout()
  return String(id)
}

function bindShortcuts(wc) {
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const ctrl = input.control || input.meta
    if (!ctrl) return
    const key = (input.key || '').toLowerCase()
    if (key === 't') {
      event.preventDefault()
      createTab(engineHomeUrl())
    } else if (key === 'w') {
      event.preventDefault()
      closeActiveTab()
    } else if (input.key === 'Tab') {
      event.preventDefault()
      cycleTab(input.shiftKey ? -1 : 1)
    }
  })
}

/* ---------- auto-login ---------- */

function requestAutologin(tabId, url) {
  const host = hostOf(url)
  if (!host || !win) return
  win.webContents.send('autologin:request', { tabId: String(tabId), host })
  // One retry for sites that render their login form via JavaScript.
  setTimeout(() => {
    if (tabViews.has(tabId) && win && !win.isDestroyed()) {
      win.webContents.send('autologin:request', { tabId: String(tabId), host })
    }
  }, 2000)
}

function buildFillScript(username, password, submit) {
  const u = JSON.stringify(username)
  const p = JSON.stringify(password)
  const doSubmit = submit ? 'true' : 'false'
  return `(function() {
    const setValue = (el, v) => {
      const proto = el.constructor.prototype
      const desc = Object.getOwnPropertyDescriptor(proto, 'value')
      if (!desc || !desc.set) return false
      desc.set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
    const visible = (el) => el && !el.disabled && el.getClientRects().length > 0
    const pw = [...document.querySelectorAll('input[type=password]')].find(visible)
    if (!pw) return 'no-password-field'
    const form = pw.closest('form')
    const scope = form || document
    const candidates = [...scope.querySelectorAll('input')].filter((el) => {
      if (el === pw || !visible(el)) return false
      const type = (el.type || 'text').toLowerCase()
      return ['text', 'email', 'tel', ''].includes(type)
    })
    const user = candidates
      .filter((el) => el.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING)
      .pop()
    if (user) setValue(user, ${u})
    setValue(pw, ${p})
    if (!${doSubmit}) return 'filled'
    if (form) {
      if (typeof form.requestSubmit === 'function') form.requestSubmit()
      else form.submit()
      return 'submitted'
    }
    const btn = [...document.querySelectorAll('button,input[type=submit]')].find((el) => {
      if (!visible(el)) return false
      const label = (el.textContent || el.value || '').trim()
      return /log\\s?in|login|sign\\s?in|submit|continue|valider|connexion|se connecter/i.test(label)
    })
    if (btn) { btn.click(); return 'submitted' }
    return 'filled-no-submit-found'
  })()`
}

ipcMain.on('autologin:fill', (_event, payload) => {
  if (!payload || typeof payload !== 'object') return
  const { tabId, username, password, submit } = payload
  const t = tabViews.get(Number(tabId))
  if (!t || typeof username !== 'string' || typeof password !== 'string') return
  const script = buildFillScript(username.slice(0, 256), password.slice(0, 512), !!submit)
  void t.view.webContents.executeJavaScript(script, true).catch(() => {})
})

/* ---------- window ---------- */

async function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 520,
    minHeight: 640,
    frame: false,
    backgroundColor: '#090b10',
    title: 'Velora',
    icon: iconPath,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
      spellcheck: true,
    },
  })

  // Unified top bar: brand/navigation + hostname + window controls.
  titlebarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'chrome-preload.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  })
  titlebarView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  titlebarView.webContents.loadFile(path.join(__dirname, 'titlebar.html'))

  // Zen-style vertical tab sidebar.
  sidebarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'chrome-preload.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  })
  sidebarView.setBounds({ x: 0, y: 0, width: 0, height: 0 })
  sidebarView.webContents.loadFile(path.join(__dirname, 'sidebar.html'))

  // z-order (bottom → top): tab views (added at index 0 on creation), sidebar, titlebar
  win.contentView.addChildView(sidebarView, 1)
  win.contentView.addChildView(titlebarView, 2)

  // Chrome views need their initial state as soon as they are ready.
  sidebarView.webContents.once('did-finish-load', () => {
    broadcastTabs()
    pushNavState()
  })
  titlebarView.webContents.once('did-finish-load', () => {
    pushNavState()
  })

  win.once('ready-to-show', () => {
    win.show()
    layout()
  })

  // Debug helper: pause before loading the page so a debugger can attach first.
  if (process.env.VELORA_SLOW_START) {
    await new Promise((r) => setTimeout(r, 12000))
  }

  win.loadFile(path.join(distPath, 'index.html'))

  // Resilience: AV software or slow disk can transiently break the first read
  // of the packaged asar. Retry loading instead of showing a blank window.
  let mainLoadAttempts = 0
  win.webContents.on('did-fail-load', (_event, _code, _desc, _url, isMainFrame) => {
    if (!isMainFrame || mainLoadAttempts >= 3) return
    mainLoadAttempts += 1
    setTimeout(() => {
      win?.loadFile(path.join(distPath, 'index.html'))
    }, 500 * mainLoadAttempts)
  })

  // Every navigation from the dashboard (search, favorites, links) opens a new tab.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) return { action: 'allow' }
    if (isValidExternalUrl(url)) createTab(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url) && isValidExternalUrl(url)) {
      event.preventDefault()
      createTab(url)
    }
  })

  bindShortcuts(win.webContents)

  win.on('resize', layout)
  win.on('maximize', () => {
    win?.webContents.send('win:maximized', true)
    for (const v of [titlebarView, sidebarView]) v?.webContents.send('win:maximized', true)
    pushNavState()
  })
  win.on('unmaximize', () => {
    win?.webContents.send('win:maximized', false)
    for (const v of [titlebarView, sidebarView]) v?.webContents.send('win:maximized', false)
    pushNavState()
  })

  // Startup page: dashboard (default) or the custom URL from settings.
  const settings = readStoreSettings()
  if (
    settings.startupMode === 'custom' &&
    typeof settings.startupUrl === 'string' &&
    isValidExternalUrl(settings.startupUrl)
  ) {
    createTab(settings.startupUrl)
  }
}

/* ---------- ipc ---------- */

ipcMain.on('win:minimize', () => win?.minimize())
ipcMain.on('win:maximize', () => {
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})
ipcMain.on('win:restore', () => win?.restore())
ipcMain.on('win:close', () => win?.close())

ipcMain.on('tab:new', () => createTab(engineHomeUrl()))
ipcMain.on('tab:activate', (_e, id) => {
  if (id === 'home' || tabViews.has(Number(id))) activateTab(id === 'home' ? 'home' : Number(id))
})
ipcMain.on('tab:close', (_e, id) => closeTab(Number(id)))
ipcMain.on('tab:closeActive', () => closeActiveTab())
ipcMain.on('sidebar:hover', (_e, hovered) => animateSidebar(!!hovered))

ipcMain.on('nav:back', () => {
  if (activeTab !== 'home') tabViews.get(activeTab)?.view.webContents.goBack()
})
ipcMain.on('nav:forward', () => {
  if (activeTab !== 'home') tabViews.get(activeTab)?.view.webContents.goForward()
})
ipcMain.on('nav:reload', () => {
  if (activeTab !== 'home') tabViews.get(activeTab)?.view.webContents.reload()
})
ipcMain.on('nav:home', () => activateTab('home'))
ipcMain.on('nav:external', () => {
  const t = activeTab === 'home' ? null : tabViews.get(activeTab)
  const url = t ? t.view.webContents.getURL() : null
  if (url) void shell.openExternal(url)
})

/* ---------- downloads ---------- */

ipcMain.handle('downloads:list', () =>
  downloads.map((d) => ({
    id: d.id,
    filename: d.filename,
    host: d.host,
    received: d.received,
    total: d.total,
    state: d.state,
    savePath: d.savePath,
  })),
)

ipcMain.on('downloads:open', (_e, id) => {
  const d = downloads.find((x) => x.id === Number(id))
  if (d && d.state === 'completed') void shell.openPath(d.savePath)
})

ipcMain.on('downloads:reveal', (_e, id) => {
  const d = downloads.find((x) => x.id === Number(id))
  if (d) shell.showItemInFolder(d.savePath)
})

ipcMain.on('downloads:remove', (_e, id) => {
  const num = Number(id)
  const item = downloadItems.get(num)
  if (item) {
    try {
      item.cancel()
    } catch {
      // ignore
    }
    downloadItems.delete(num)
  }
  const idx = downloads.findIndex((x) => x.id === num)
  if (idx >= 0) downloads.splice(idx, 1)
  broadcastDownloads(true)
})

ipcMain.on('downloads:clear', () => {
  for (let i = downloads.length - 1; i >= 0; i--) {
    if (downloads[i].state !== 'progressing') downloads.splice(i, 1)
  }
  broadcastDownloads(true)
})

/* ---------- blocking stats ---------- */

ipcMain.handle('blocking:total', () => ({ total: blockTotal, enabled: blockTrackers }))

/* ---------- persistent store file (survives version upgrades) ---------- */

ipcMain.on('store:save', (_event, json) => {
  try {
    if (typeof json !== 'string' || json.length > 5_000_000) return
    fs.writeFileSync(storePath, json)
    // Live-apply settings the main process owns (blocking, workspaces).
    applyStoreSettings(json)
  } catch {
    // Best effort — localStorage remains as a fallback copy.
  }
})

ipcMain.on('store:get', (event) => {
  try {
    event.returnValue = fs.existsSync(storePath) ? fs.readFileSync(storePath, 'utf8') : null
  } catch {
    event.returnValue = null
  }
})

ipcMain.on('store:clear', () => {
  try {
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath)
  } catch {
    // ignore
  }
})

app.whenReady().then(() => {
  const stored = readStoreFile()
  if (stored) applyStoreSettings(stored)
  setupBlocking()
  setupDownloads()
  void createWindow()
  void setupUpdater()
})

app.on('window-all-closed', () => {
  app.quit()
})
