const port = process.argv[2] ?? '9333'
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
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const my = id++
      pending.set(my, resolve)
      ws.send(JSON.stringify({ id: my, method, params }))
    })
  const evalJs = (expression) =>
    send('Runtime.evaluate', { expression, returnByValue: true }).then((m) => m.result?.result?.value ?? m.result?.result ?? m.result)
  return { ws, evalJs, send }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const main = async () => {
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }
  const find = async (pred) => (await targets()).find(pred)
  const app = await find((t) => t.url.includes('index.html'))
  const sb = await find((t) => t.url.includes('sidebar.html'))
  const A = await connect(app.webSocketDebuggerUrl)
  const S = await connect(sb.webSocketDebuggerUrl)
  const t0 = Date.now()
  while (Date.now() - t0 < 30000) {
    if (await A.evalJs(`!!document.getElementById('velora-search')`) && await S.evalJs(`!!window.veloraChrome`)) break
    await sleep(400)
  }

  // Open a tab, then check visibility before/after bringToFront, and measure.
  await A.evalJs(`(() => {
    const el = document.querySelector('#velora-search')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'occlusion test')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await A.evalJs(`document.querySelector('#velora-search').closest('form').requestSubmit()`)
  let tab = null
  const t1 = Date.now()
  while (Date.now() - t1 < 15000) {
    tab = await find((t) => t.url.includes('duckduckgo'))
    if (tab) break
    await sleep(400)
  }
  if (!tab) { console.log('FAIL no tab'); return }
  const T = await connect(tab.webSocketDebuggerUrl)
  await sleep(800)

  const state = async (label) => {
    const vis = await A.evalJs(`document.visibilityState`)
    console.log(`${label}: visibility=${vis} tab=${await T.evalJs('window.innerWidth')} sidebar=${await S.evalJs('window.innerWidth')}`)
  }

  await state('avant bringToFront')
  await A.send('Page.bringToFront')
  await sleep(400)
  await A.send('Page.enable')
  await A.send('Page.bringToFront')
  await sleep(400)
  await state('apres bringToFront')

  await S.evalJs(`window.veloraChrome.setSidebarHover(true)`)
  await sleep(700)
  await state('apres expand')
  await S.evalJs(`window.veloraChrome.setSidebarHover(false)`)
  await sleep(700)
  await state('apres collapse')

  A.ws.close(); S.ws.close(); T.ws.close()
  console.log('OCCLUSION PROBE DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
