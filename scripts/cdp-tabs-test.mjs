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
  const waitCdp = async () => {
    for (let i = 0; i < 40; i++) {
      try { await fetch(`http://localhost:${port}/json/version`); return true } catch { await sleep(1000) }
    }
    return false
  }
  if (!(await waitCdp())) { console.log('FAIL  CDP never ready'); return }

  const find = async (pred) => {
    const list = await targets()
    return list.find(pred)
  }

  // 1. Chrome views all loaded
  const appPage = await find((t) => t.url.includes('index.html'))
  const tabsPage = await find((t) => t.url.includes('sidebar.html'))
  const titlebarPage = await find((t) => t.url.includes('titlebar.html'))
  pass('app view loaded', !!appPage)
  pass('sidebar loaded', !!tabsPage)
  pass('titlebar loaded', !!titlebarPage)
  if (!appPage || !tabsPage) return

  const app = await connect(appPage.webSocketDebuggerUrl)
  const strip = await connect(tabsPage.webSocketDebuggerUrl)

  const waitFor = async (expr, label, timeoutMs = 30000) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (await app.evalJs(`!!(${expr})`)) return true
      await sleep(500)
    }
    console.log(`TIMEOUT waiting for ${label}`)
    return false
  }
  await waitFor(`document.querySelector('header.glass')`, 'app mount')

  // 2. Initial tabs state: home only
  await sleep(1000)
  let tabsState = await strip.evalJs(`[...document.querySelectorAll('.tab')].map(t => t.dataset.id + (t.classList.contains('active') ? '*' : ''))`)
  pass('starts with home tab only', tabsState.length === 1 && tabsState[0] === 'home*', JSON.stringify(tabsState))

  // 3. THE FIX: Enter in the search bar must open a search tab
  const filled = await app.evalJs(`(() => {
    const el = document.querySelector('#velora-search')
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, 'privacy tools')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  pass('search filled', filled === true)
  await app.evalJs(`document.querySelector('#velora-search').closest('form').requestSubmit()`)

  // New tab target with duckduckgo must appear
  let searchTarget = null
  const start = Date.now()
  while (Date.now() - start < 15000) {
    searchTarget = await find((t) => t.url.includes('duckduckgo.com'))
    if (searchTarget) break
    await sleep(500)
  }
  pass('Enter opens a search tab', !!searchTarget, searchTarget?.url?.slice(0, 60) ?? 'none')

  await sleep(1500)
  tabsState = await strip.evalJs(`[...document.querySelectorAll('.tab')].map(t => t.dataset.id + (t.classList.contains('active') ? '*' : ''))`)
  pass('strip shows 2 tabs, search active', tabsState.length === 2 && tabsState[1]?.endsWith('*'), JSON.stringify(tabsState))

  // 4. Home tab still alive underneath
  const homeAlive = await app.evalJs(`!!document.getElementById('velora-search')`)
  pass('dashboard still mounted under tab', homeAlive)

  // 5. Switch back home via strip click
  await strip.evalJs(`document.querySelector('.tab[data-id="home"]').click()`)
  await sleep(800)
  tabsState = await strip.evalJs(`[...document.querySelectorAll('.tab')].map(t => t.dataset.id + (t.classList.contains('active') ? '*' : ''))`)
  pass('home re-activated', tabsState[0] === 'home*', JSON.stringify(tabsState))

  // 6. New tab via + button (Ctrl+T path)
  await strip.evalJs(`document.getElementById('newtab').click()`)
  await sleep(2500)
  tabsState = await strip.evalJs(`[...document.querySelectorAll('.tab')].map(t => t.dataset.id + (t.classList.contains('active') ? '*' : ''))`)
  pass('+ opens engine homepage tab', tabsState.length === 3 && tabsState[2]?.endsWith('*'), JSON.stringify(tabsState))

  // 7. Close a tab via the strip
  await strip.evalJs(`[...document.querySelectorAll('.tab .close')][0].click()`)
  await sleep(800)
  tabsState = await strip.evalJs(`[...document.querySelectorAll('.tab')].map(t => t.dataset.id + (t.classList.contains('active') ? '*' : ''))`)
  pass('tab closed from strip', tabsState.length === 2, JSON.stringify(tabsState))

  app.ws.close()
  strip.ws.close()
  console.log('TABS E2E DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
