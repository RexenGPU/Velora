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

const main = async () => {
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }
  const all = await targets()
  console.log('targets:')
  for (const t of all) console.log('  ', t.url.slice(0, 90))
  const sb = all.find((t) => t.url.includes('sidebar.html'))
  const S = await connect(sb.webSocketDebuggerUrl)

  await S.evalJs(`window.veloraChrome.setSidebarHover(true)`)
  await sleep(800)

  const probe = await S.evalJs(`JSON.stringify({
    innerWidth: window.innerWidth,
    docClientWidth: document.documentElement.clientWidth,
    docRectWidth: Math.round(document.documentElement.getBoundingClientRect().width),
    vv: window.visualViewport ? window.visualViewport.width : -1,
    stripW: Math.round((document.getElementById('list') || document.body).getBoundingClientRect().width),
  })`)
  console.log('after expand:', probe)
  await S.evalJs(`window.veloraChrome.setSidebarHover(false)`)
  S.ws.close()
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
