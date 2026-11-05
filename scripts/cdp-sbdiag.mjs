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
  while (Date.now() - start < 90000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }
  const find = async (pred) => (await targets()).find(pred)
  const app = await find((t) => t.url.includes('index.html'))
  const sb = await find((t) => t.url.includes('sidebar.html'))
  const A = await connect(app.webSocketDebuggerUrl)
  const S = await connect(sb.webSocketDebuggerUrl)
  let ready = false
  const t0 = Date.now()
  while (Date.now() - t0 < 60000) {
    if (await A.evalJs(`!!document.getElementById('velora-search')`) && await S.evalJs(`!!document.getElementById('newtab')`)) { ready = true; break }
    await sleep(400)
  }
  if (!ready) { console.log('ABORT not mounted'); return }

  const sbW = async () => await S.evalJs(`window.innerWidth`)
  const cycle = async (label) => {
    await S.evalJs(`window.veloraChrome.setSidebarHover(true)`)
    await sleep(600)
    const e = await sbW()
    await S.evalJs(`window.veloraChrome.setSidebarHover(false)`)
    await sleep(600)
    const c = await sbW()
    console.log(`${label}: expand=${e} collapse=${c} ${e === 210 ? 'OK' : 'GELE'}`)
  }

  await cycle('avant deblocage')
  await S.evalJs(`window.veloraChrome.minimize()`)
  await sleep(600)
  await S.evalJs(`window.veloraChrome.maximize()`)
  await sleep(900)
  await cycle('apres minimize+maximize')
  await S.evalJs(`window.veloraChrome.maximize()`)
  await sleep(600)
  await cycle('retour normal')

  A.ws.close(); S.ws.close()
  console.log('SBDIAG DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
