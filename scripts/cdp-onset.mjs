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
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(500) }
  }
  const find = async (pred) => (await targets()).find(pred)
  const sb = await find((t) => t.url.includes('sidebar.html'))
  const S = await connect(sb.webSocketDebuggerUrl)
  while (!(await S.evalJs(`!!window.veloraChrome`))) await sleep(300)

  const w = async () => await S.evalJs(`window.innerWidth`)
  const cycle = async (label) => {
    await S.evalJs(`window.veloraChrome.setSidebarHover(true)`)
    await sleep(500)
    const expanded = await w()
    await S.evalJs(`window.veloraChrome.setSidebarHover(false)`)
    await sleep(500)
    const collapsed = await w()
    console.log(`${label}: expand=${expanded} collapse=${collapsed} ${expanded === 210 ? 'OK' : 'GELE'}`)
    return expanded === 210
  }

  // Timing: try cycles at increasing delays after mount.
  await cycle('t+0.5s ')
  await sleep(2000)
  await cycle('t+3s   ')
  await sleep(5000)
  await cycle('t+8s   ')

  // Unstick variant A: maximize alone.
  await S.evalJs(`window.veloraChrome.maximize()`)
  await sleep(600)
  const a = await cycle('apres maximize seul')
  await S.evalJs(`window.veloraChrome.maximize()`) // toggles back to normal
  await sleep(600)

  // Unstick variant B: minimize + maximize (restore path).
  if (!a) {
    await S.evalJs(`window.veloraChrome.minimize()`)
    await sleep(500)
    await S.evalJs(`window.veloraChrome.maximize()`)
    await sleep(700)
    await cycle('apres minimize+maximize')
    await S.evalJs(`window.veloraChrome.maximize()`)
    await sleep(500)
  }
  S.ws.close()
  console.log('ONSET PROBE DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
