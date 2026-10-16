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
  // Wait for CDP.
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }

  const pages = await targets()
  const app = pages.find((t) => t.url.includes('index.html'))
  const titlebar = pages.find((t) => t.url.includes('titlebar.html'))
  const sidebar = pages.find((t) => t.url.includes('sidebar.html'))

  pass('no floating toolbar view', !pages.some((t) => t.url.includes('toolbar.html')))
  pass('titlebar loaded', !!titlebar)
  pass('sidebar loaded', !!sidebar)
  if (!app || !titlebar) return

  const A = await connect(app.webSocketDebuggerUrl)
  const T = await connect(titlebar.webSocketDebuggerUrl)

  // Wait for app + titlebar DOMs.
  const t0 = Date.now()
  while (Date.now() - t0 < 30000) {
    const ready = await T.evalJs(`!!document.getElementById('brand') && !!document.getElementById('nav')`)
    const appReady = await A.evalJs(`!!document.getElementById('velora-search')`)
    if (ready && appReady) break
    await sleep(500)
  }

  // 1. Home state: brand visible, nav hidden, 3 window buttons in the single bar.
  const homeState = await T.evalJs(`({
    brandVisible: !document.getElementById('brand').classList.contains('hidden'),
    navHidden: document.getElementById('nav').classList.contains('hidden'),
    externalHidden: document.getElementById('external').classList.contains('hidden'),
    winBtns: document.querySelectorAll('.win-btn').length,
  })`)
  pass(
    'home: single bar shows brand + window controls',
    homeState.brandVisible && homeState.navHidden && homeState.externalHidden && homeState.winBtns === 3,
    JSON.stringify(homeState),
  )

  // 2. Quick-launch alignment regression.
  const heights = await A.evalJs(`(() => {
    const grid = document.querySelector('.grid')
    if (!grid) return null
    return [...grid.children].map((k) => Math.round(k.getBoundingClientRect().height))
  })()`)
  if (heights && heights.length > 1) {
    const allEqual = heights.every((h) => h === heights[0])
    pass('quick-launch tiles aligned', allEqual, `heights ${[...new Set(heights)].join('/')}px`)
  }

  // 3. Open a search tab → the single bar switches to navigation mode.
  await A.evalJs(`(() => {
    const el = document.querySelector('#velora-search')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'velora browser test')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await A.evalJs(`document.querySelector('#velora-search').closest('form').requestSubmit()`)

  let pageTab = null
  const t1 = Date.now()
  while (Date.now() - t1 < 15000) {
    pageTab = (await targets()).find((t) => t.url.includes('duckduckgo.com'))
    if (pageTab) break
    await sleep(500)
  }
  pass('search opened a tab', !!pageTab)

  // Poll the titlebar: it flips to navigation mode once the page commits.
  let pageState = null
  const t2 = Date.now()
  while (Date.now() - t2 < 12000) {
    pageState = await T.evalJs(`({
      brandVisible: !document.getElementById('brand').classList.contains('hidden'),
      navVisible: !document.getElementById('nav').classList.contains('hidden'),
      externalVisible: !document.getElementById('external').classList.contains('hidden'),
      hostname: document.getElementById('hostname').textContent,
      backEnabled: !document.getElementById('back').disabled,
    })`)
    if (pageState.navVisible && pageState.hostname.includes('duckduckgo')) break
    await sleep(500)
  }
  pass(
    'page: single bar shows navigation + hostname + controls',
    !!pageState && pageState.navVisible && pageState.externalVisible && pageState.hostname.includes('duckduckgo'),
    JSON.stringify(pageState),
  )

  // 4. Home button in the bar returns to the dashboard.
  await T.evalJs(`document.getElementById('home').click()`)
  await sleep(800)
  const backHome = await T.evalJs(`({
    brandVisible: !document.getElementById('brand').classList.contains('hidden'),
    navHidden: document.getElementById('nav').classList.contains('hidden'),
  })`)
  pass('home button restores dashboard state', backHome.brandVisible && backHome.navHidden)

  A.ws.close()
  T.ws.close()
  console.log('POLISH E2E DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
