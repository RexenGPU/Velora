import fs from 'node:fs'

const port = process.argv[2] ?? '9222'
const targets = async () =>
  (await (await fetch(`http://localhost:${port}/json/list`)).json()).filter((t) => t.type === 'page')

const connect = async (url) => {
  const ws = new WebSocket(url)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let id = 1
  const pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  }
  const evalJs = (expression) =>
    new Promise((resolve) => {
      const my = id++
      pending.set(my, resolve)
      ws.send(JSON.stringify({ id: my, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }))
    }).then((m) => m.result?.result?.value ?? m.result?.result ?? m.result)
  return { ws, evalJs }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pass = (k, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${k}${extra ? ' — ' + extra : ''}`)

const main = async () => {
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }
  const find = async (pred) => (await targets()).find(pred)
  const app = await find((t) => t.url.includes('index.html'))
  const sb = await find((t) => t.url.includes('sidebar.html'))
  const tb = await find((t) => t.url.includes('titlebar.html'))
  if (!app || !sb || !tb) { console.log('FAIL chrome views'); return }
  const A = await connect(app.webSocketDebuggerUrl)
  const S = await connect(sb.webSocketDebuggerUrl)
  const T = await connect(tb.webSocketDebuggerUrl)

  let ready = false
  const t0 = Date.now()
  while (Date.now() - t0 < 90000) {
    const appOk = await A.evalJs(`!!document.getElementById('velora-search')`)
    const sbOk = await S.evalJs(`!!window.veloraChrome && !!document.getElementById('newtab')`)
    if (appOk && sbOk) {
      ready = true
      break
    }
    await sleep(400)
  }
  if (!ready) {
    console.log('ABORT: app or sidebar never mounted')
    return
  }
  await sleep(800)

  /* ---------- 1. Sidebar regression: no workspaces UI, downloads panel present when needed ---------- */
  let tabCount = 0
  const tSide = Date.now()
  while (Date.now() - tSide < 8000) {
    tabCount = await S.evalJs(`document.querySelectorAll('#list .tab').length`)
    if (tabCount >= 1) break
    await sleep(300)
  }
  const sidebarClean = await S.evalJs(`({
    noSpaces: !document.getElementById('spaces'),
    hasNewTab: !!document.getElementById('newtab'),
  })`)
  pass(
    'sidebar without the spaces UI',
    sidebarClean.noSpaces && sidebarClean.hasNewTab && tabCount >= 1,
    JSON.stringify({ ...sidebarClean, tabs: tabCount }),
  )

  const settingsOpen = await A.evalJs(`(() => {
    const btn = document.querySelector('button[aria-label="Settings"]')
    if (!btn) return false
    btn.click()
    return true
  })()`)
  let dialogOpen = false
  const tDlg = Date.now()
  while (Date.now() - tDlg < 15000) {
    dialogOpen = await A.evalJs(`!!document.querySelector('[role="dialog"][aria-label="Settings"]')`)
    if (dialogOpen) break
    await sleep(400)
  }
  pass('Settings opens from the app button', settingsOpen === true && dialogOpen, `clicked=${settingsOpen} dialog=${dialogOpen}`)

  /* ---------- 2. Blocking toggle via real UI ---------- */
  let toggled = false
  const tTog = Date.now()
  while (Date.now() - tTog < 10000) {
    toggled = await A.evalJs(`(() => {
      const sw = document.querySelector('button[role="switch"][aria-label="Block known tracker requests"]')
      if (!sw) return false
      sw.click()
      return true
    })()`)
    if (toggled) break
    await sleep(400)
  }
  pass('blocking toggle found & clicked', toggled)
  await sleep(700)
  const enabled = await A.evalJs(`JSON.parse(localStorage.getItem('velora:v1')).settings.blockTrackers === true`)
  pass('blockTrackers persisted', enabled)

  // Open a tab via search
  await A.evalJs(`(() => {
    const el = document.querySelector('#velora-search')
    if (!el) return false
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'example.com')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await A.evalJs(`document.querySelector('#velora-search').closest('form').requestSubmit()`)

  let tab = null
  const t1 = Date.now()
  while (Date.now() - t1 < 20000) {
    tab = await find((t) => t.url.includes('example.com'))
    if (tab) break
    await sleep(500)
  }
  pass('tab opened for blocking test', !!tab)
  if (!tab) return
  const P = await connect(tab.webSocketDebuggerUrl)
  await sleep(1500)

  // Pick a tracker domain that is reachable on this machine (system DNS
  // blockers may already drop some), so our webRequest is the only filter.
  const CANDIDATES = ['sentry.io', 'datadoghq.com', 'cdn.segment.com', 'static.hotjar.com', 'connect.facebook.net', 'cloudflareinsights.com']
  let probeDomain = null
  for (const domain of CANDIDATES) {
    const ok = await fetch(`https://${domain}/`, { method: 'HEAD', signal: AbortSignal.timeout(6000) })
      .then((r) => r.status < 500)
      .catch(() => false)
    if (ok) {
      probeDomain = domain
      break
    }
  }
  console.log(`      (probe tracker domain: ${probeDomain ?? 'NONE reachable'})`)

  if (!probeDomain) {
    console.log('SKIP  blocking network probe (no reachable tracker domain on this machine)')
  } else {
    const probeUrl = `https://${probeDomain}/velora-e2e-probe`
    // The session counter only increments when OUR filter cancels a request —
    // it is the authority, independent of network flakiness.
    await P.evalJs(
      `fetch(${JSON.stringify(probeUrl)}, { mode: 'no-cors' }).then(() => 'reached').catch(() => 'blocked')`,
    )

    let total = 0
    const tB = Date.now()
    while (Date.now() - tB < 10000) {
      const stats = await A.evalJs(`window.veloraDesktop.getBlockingStats().then(s => JSON.stringify(s))`)
      try {
        const parsed = JSON.parse(stats)
        total = parsed.total
        if (total >= 1) break
      } catch { /* ignore */ }
      await sleep(400)
    }
    pass('tracker request blocked (counter)', total >= 1, `total=${total}`)

    let chip = { hidden: true, count: '0' }
    const tChip = Date.now()
    while (Date.now() - tChip < 6000) {
      chip = await T.evalJs(`({ hidden: document.getElementById('blocked').classList.contains('hidden'), count: document.getElementById('blocked-count').textContent })`)
      if (!chip.hidden && Number(chip.count) >= 1) break
      await sleep(400)
    }
    pass('titlebar shows per-page blocked count', !chip.hidden && Number(chip.count) >= 1, JSON.stringify(chip))

    // Toggle OFF → the counter must stay frozen; and the request should reach
    // the network (retried, since individual probes can be flaky).
    await A.evalJs(`(() => {
      const sw = document.querySelector('button[role="switch"][aria-label="Block known tracker requests"]')
      if (sw) sw.click()
    })()`)
    await sleep(700)
    let reached = 'blocked'
    for (let attempt = 0; attempt < 3 && reached !== 'reached'; attempt++) {
      reached = await P.evalJs(
        `fetch(${JSON.stringify(probeUrl)}, { mode: 'no-cors' }).then(() => 'reached').catch(() => 'blocked')`,
      )
      if (reached !== 'reached') await sleep(800)
    }
    const statsAfter = JSON.parse(await A.evalJs(`window.veloraDesktop.getBlockingStats().then(s => JSON.stringify(s))`))
    pass('disabling restores requests', reached === 'reached' && statsAfter.total === total, `fetch=${reached} counter ${total}→${statsAfter.total}`)
  }

  /* ---------- 3. Downloads ---------- */
  await P.evalJs(`location.href = 'https://github.com/RexenGPU/velora/archive/refs/heads/main.zip'`)
  let dl = null
  const t2 = Date.now()
  while (Date.now() - t2 < 45000) {
    const list = await A.evalJs(`window.veloraDesktop.listDownloads().then(l => JSON.stringify(l))`)
    try {
      const arr = JSON.parse(list)
      dl = arr.find((d) => d.state === 'completed' && d.filename.includes('.zip'))
      if (dl) break
    } catch { /* ignore */ }
    await sleep(1000)
  }
  pass('download intercepted & completed', !!dl, dl ? `${dl.filename} (${Math.round(dl.total / 1024)} KB)` : 'not found')
  if (dl?.savePath) {
    const exists = fs.existsSync(dl.savePath)
    pass('file saved on disk', exists, dl.savePath)
    try { fs.unlinkSync(dl.savePath) } catch { /* ignore */ }
  }

  const dlUi = await S.evalJs(`({
    visible: !document.getElementById('downloads').classList.contains('hidden'),
    rows: document.querySelectorAll('#dl-list .dl').length,
  })`)
  pass('sidebar download panel visible', dlUi.visible && dlUi.rows >= 1, JSON.stringify(dlUi))

  // Close settings panel, then test scratchpad + wallpaper
  await A.evalJs(`document.querySelector('[aria-label="Close settings"]')?.click()`)
  await sleep(500)

  /* ---------- 4. Scratchpad ---------- */
  await A.evalJs(`location.hash = '#/dashboard'`)
  await sleep(600)
  const scratchOk = await A.evalJs(`(async () => {
    const add = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add note' || b.textContent.trim() === 'Add your first note')
    if (!add) return 'no-button'
    add.click()
    await new Promise(r => setTimeout(r, 400))
    const ta = document.querySelector('textarea[aria-label="Note"]')
    if (!ta) return 'no-textarea'
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, 'e2e sticky note')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    return 'typed'
  })()`)
  pass('scratchpad note typed', scratchOk === 'typed', String(scratchOk))
  await sleep(1200)
  const persistedNote = await A.evalJs(`localStorage.getItem('velora:v1').includes('e2e sticky note')`)
  pass('scratchpad persisted', persistedNote)

  /* ---------- 5. Wallpaper ---------- */
  await A.evalJs(`document.querySelector('[aria-label="Settings"]')?.click()`)
  await sleep(700)
  const wallToggled = await A.evalJs(`(() => {
    const group = document.querySelector('[role="radiogroup"][aria-label="Background"]')
    if (!group) return false
    const btn = [...group.querySelectorAll('button')].find(b => b.textContent.includes('Gradient'))
    if (!btn) return false
    btn.click()
    return true
  })()`)
  pass('wallpaper gradient selected', wallToggled)
  await sleep(500)
  const wallLayer = await A.evalJs(`[...document.querySelectorAll('div')].some(d => d.style && d.style.zIndex === '-2')`)
  pass('wallpaper layer rendered', wallLayer)
  const wallPersisted = await A.evalJs(`JSON.parse(localStorage.getItem('velora:v1')).settings.wallpaper.kind === 'gradient'`)
  pass('wallpaper persisted', wallPersisted)

  A.ws.close(); S.ws.close(); T.ws.close(); P.ws.close()
  console.log('FEATURES E2E DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
