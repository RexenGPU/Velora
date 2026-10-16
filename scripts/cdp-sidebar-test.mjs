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
      ws.send(JSON.stringify({ id: my, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }))
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
  const appPage = await find((t) => t.url.includes('index.html'))
  const sbPage = await find((t) => t.url.includes('sidebar.html'))
  const tPage = await find((t) => t.url.includes('titlebar.html'))
  if (!appPage || !sbPage || !tPage) { console.log('FAIL  chrome views missing'); return }

  const A = await connect(appPage.webSocketDebuggerUrl)
  const S = await connect(sbPage.webSocketDebuggerUrl)
  const T = await connect(tPage.webSocketDebuggerUrl)

  const t0 = Date.now()
  while (Date.now() - t0 < 30000) {
    if (await A.evalJs(`!!document.getElementById('velora-search')`)) break
    await sleep(500)
  }

  // Open a search tab.
  await A.evalJs(`(() => {
    const el = document.querySelector('#velora-search')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'sidebar expand test')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await A.evalJs(`document.querySelector('#velora-search').closest('form').requestSubmit()`)

  let pageTab = null
  const t1 = Date.now()
  while (Date.now() - t1 < 15000) {
    pageTab = await find((t) => t.url.includes('duckduckgo.com'))
    if (pageTab) break
    await sleep(500)
  }
  pass('search tab opened', !!pageTab)
  if (!pageTab) return
  const P = await connect(pageTab.webSocketDebuggerUrl)

  // Wait until the tab page has an actual width and the bar is in page mode.
  const t2 = Date.now()
  while (Date.now() - t2 < 12000) {
    const nav = await T.evalJs(`!document.getElementById('nav').classList.contains('hidden')`)
    if (nav) break
    await sleep(400)
  }
  await sleep(500)

  // 1. Favicon in the sidebar tab.
  const favicon = await S.evalJs(`(() => {
    const tab = document.querySelector('.tab:not([data-id="home"])')
    const img = tab && tab.querySelector('.tile img')
    return img ? img.getAttribute('src') : null
  })()`)
  pass('tab favicon present', !!favicon && favicon.includes('icons.duckduckgo.com'), favicon ?? 'none')

  // 2. Content adapts (never covered): measure page width across expansion.
  const widthCollapsed = await P.evalJs(`window.innerWidth`)
  await S.evalJs(`window.veloraChrome.setSidebarHover(true)`)
  await sleep(600)
  const widthExpanded = await P.evalJs(`window.innerWidth`)
  await S.evalJs(`window.veloraChrome.setSidebarHover(false)`)
  await sleep(600)
  const widthBack = await P.evalJs(`window.innerWidth`)

  const expandedDelta = widthCollapsed - widthExpanded
  pass(
    'page shrinks when sidebar expands (no overlay)',
    expandedDelta >= 150 && expandedDelta <= 180,
    `${widthCollapsed}px → ${widthExpanded}px (Δ${expandedDelta})`,
  )
  pass('page restored when sidebar collapses', Math.abs(widthBack - widthCollapsed) <= 2, `${widthBack}px`)

  // 3. Home app padding follows too.
  await S.evalJs(`window.veloraChrome.setSidebarHover(true)`)
  await sleep(600)
  const appPadExpanded = await A.evalJs(`getComputedStyle(document.documentElement).getPropertyValue('--v-sidebar')`)
  await S.evalJs(`window.veloraChrome.setSidebarHover(false)`)
  await sleep(600)
  const appPadCollapsed = await A.evalJs(`getComputedStyle(document.documentElement).getPropertyValue('--v-sidebar')`)
  pass(
    'home padding tracks sidebar width',
    appPadExpanded.includes('210') && appPadCollapsed.includes('46'),
    `${appPadCollapsed.trim()} / ${appPadExpanded.trim()}`,
  )

  A.ws.close(); S.ws.close(); T.ws.close(); P.ws.close()
  console.log('SIDEBAR E2E DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
