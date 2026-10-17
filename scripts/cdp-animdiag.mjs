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
  const app = (await targets()).find((t) => t.url.includes('index.html'))
  const sb = (await targets()).find((t) => t.url.includes('sidebar.html'))
  const A = await connect(app.webSocketDebuggerUrl)
  const S = await connect(sb.webSocketDebuggerUrl)
  const t0 = Date.now()
  while (Date.now() - t0 < 30000) {
    if (await A.evalJs(`!!document.getElementById('velora-search')`)) break
    await sleep(400)
  }

  const measure = async () => await S.evalJs(`Math.round(document.documentElement.getBoundingClientRect().width)`)

  console.log('initial width:', await measure())
  await S.evalJs(`window.veloraChrome.setSidebarHover(true)`)
  for (let i = 0; i < 12; i++) {
    await sleep(150)
    process.stdout.write(`+${(i + 1) * 150}ms: ${await measure()}  `)
  }
  console.log('')
  await S.evalJs(`window.veloraChrome.setSidebarHover(false)`)
  for (let i = 0; i < 6; i++) {
    await sleep(200)
    process.stdout.write(`-${(i + 1) * 200}ms: ${await measure()}  `)
  }
  console.log('')
  A.ws.close(); S.ws.close()
  console.log('DIAG DONE')
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
