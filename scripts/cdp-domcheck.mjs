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
  const app = all.find((t) => t.url.includes('index.html'))
  const sb = all.find((t) => t.url.includes('sidebar.html'))
  const A = await connect(app.webSocketDebuggerUrl)
  const S = await connect(sb.webSocketDebuggerUrl)
  await sleep(3000)

  const appState = await A.evalJs(`JSON.stringify({
    ready: document.readyState,
    rootChildren: document.getElementById('root')?.children.length ?? -1,
    hasSearch: !!document.getElementById('velora-search'),
    bodyStart: (document.body.innerText || '').slice(0, 120),
    scripts: document.querySelectorAll('script').length,
    scriptOk: [...document.querySelectorAll('script')].map(s => s.src.split('/').pop()),
    errs: (window.__errs || []).slice(0, 3),
  })`)
  console.log('APP:', appState)

  const sbState = await S.evalJs(`JSON.stringify({
    ready: document.readyState,
    hasChrome: !!window.veloraChrome,
    newtab: !!document.getElementById('newtab'),
    tabs: document.querySelectorAll('#list .tab').length,
    listHtmlLen: (document.getElementById('list')?.innerHTML ?? '').length,
  })`)
  console.log('SIDEBAR:', sbState)

  A.ws.close(); S.ws.close()
  console.log('DOMCHECK DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
