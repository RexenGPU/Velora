const port = process.argv[2] ?? '9222'

const targets = async () =>
  (await (await fetch(`http://localhost:${port}/json/list`)).json()).filter((t) => t.type === 'page')

const connect = async (url) => {
  const ws = new WebSocket(url)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  let nextId = 1
  const pending = new Map()
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = nextId++
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evalJs = async (expression) => {
    const m = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    return m.result?.result?.value ?? m.result?.result ?? m.result
  }
  return { ws, evalJs, send }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const pass = (k, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${k}${extra ? ' — ' + extra : ''}`)

const setInput = (sel, value) => `
  (() => {
    const el = document.querySelector(${JSON.stringify(sel)})
    if (!el) return false
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(el, ${JSON.stringify(value)})
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()
`

const main = async () => {
  let page = (await targets()).find((t) => !t.url.includes('toolbar.html'))
  let { ws, evalJs, send } = await connect(page.webSocketDebuggerUrl)

  const waitFor = async (expression, label, timeoutMs = 30000) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const ok = await evalJs(`!!(${expression})`)
      if (ok) return true
      await sleep(500)
    }
    console.log(`TIMEOUT waiting for: ${label}`)
    return false
  }

  // Wait for mount; disabled history means no nav item.
  await waitFor(`document.querySelector('header.glass')`, 'app mount')
  const appIndexUrl = page.url // remember the app page URL to navigate back later
  const navHiddenWhileDisabled = await evalJs(
    `![...document.querySelectorAll('nav a')].some(a => a.getAttribute('href') === '#/history')`,
  )
  pass('history nav hidden when disabled', navHiddenWhileDisabled)

  // Opt in via settings state, then reload.
  await evalJs(`(() => {
    const d = JSON.parse(localStorage.getItem('velora:v1'))
    d.settings.historyEnabled = true
    localStorage.setItem('velora:v1', JSON.stringify(d))
    return true
  })()`)
  await evalJs(`location.reload()`)
  await sleep(2500)
  page = (await targets()).find((t) => !t.url.includes('toolbar.html'))
  ;({ ws, evalJs, send } = await connect(page.webSocketDebuggerUrl))
  await waitFor(`document.querySelector('header.glass')`, 'app mount after reload')

  const navVisible = await evalJs(
    `[...document.querySelectorAll('nav a')].some(a => a.getAttribute('href') === '#/history')`,
  )
  pass('history nav visible when enabled', navVisible)

  // Type an address in the search bar and submit → in-app navigation (page unloads).
  await evalJs(setInput('#velora-search', 'example.org'))
  await evalJs(`document.querySelector('#velora-search').closest('form').requestSubmit()`)

  // Wait for the window to navigate away.
  const navigated = await (async () => {
    const start = Date.now()
    while (Date.now() - start < 15000) {
      const pages = await targets()
      const p = pages.find((t) => t.url.startsWith('https://example.org'))
      if (p) return true
      await sleep(500)
    }
    return false
  })()
  pass('address navigated in-app', navigated)

  // Navigate back to the dashboard.
  page = (await targets()).find((t) => !t.url.includes('toolbar.html'))
  ;({ ws, evalJs, send } = await connect(page.webSocketDebuggerUrl))
  await send('Page.navigate', { url: appIndexUrl })
  await sleep(2500)
  page = (await targets()).find((t) => !t.url.includes('toolbar.html'))
  ;({ ws, evalJs, send } = await connect(page.webSocketDebuggerUrl))
  await waitFor(`document.querySelector('header.glass')`, 'app mount after return')

  // Check history recorded the entry (synchronous write survived unload).
  await evalJs(`location.hash = '#/history'`)
  await sleep(700)
  const entryRecorded = await evalJs(`document.body.innerText.includes('example.org')`)
  pass('history entry survived navigation', entryRecorded)

  const stored = await evalJs(`(() => { const d = JSON.parse(localStorage.getItem('velora:v1')); return { n: d.history?.length ?? 0, kind: d.history?.[0]?.kind, excludedFromBackup: true } })()`)
  pass('entry persisted with kind', stored.n >= 1 && stored.kind === 'address', `${stored.n} entries`)

  ws.close()
  console.log('HISTORY E2E DONE')
}

main().catch((e) => {
  console.error('E2E ERROR:', e)
  process.exit(1)
})
