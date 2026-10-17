const port = process.argv[2] ?? '9333'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const main = async () => {
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }
  const ver = await (await fetch(`http://localhost:${port}/json/version`)).json()
  const targets = (await (await fetch(`http://localhost:${port}/json/list`)).json()).filter((t) => t.type === 'page')
  const app = targets.find((t) => t.url.includes('index.html'))

  const ws = new WebSocket(ver.webSocketDebuggerUrl)
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

  // app target id from the page's ws url (…/page/<targetId>)
  const targetId = app.webSocketDebuggerUrl.split('/').pop()
  const win = await send('Browser.getWindowForTarget', { targetId })
  console.log('WINDOW FOR APP:', JSON.stringify(win.result ?? win))

  // And the visibility of the app page itself.
  const pageWs = new WebSocket(app.webSocketDebuggerUrl)
  await new Promise((res, rej) => { pageWs.onopen = res; pageWs.onerror = rej })
  const pSend = (method, params = {}) =>
    new Promise((resolve) => {
      const my = id++
      pending.set(my, resolve)
      pageWs.send(JSON.stringify({ id: my, method, params }))
    })
  const vis = await pSend('Runtime.evaluate', {
    expression: `JSON.stringify({ visibility: document.visibilityState, hasFocus: document.hasFocus(), innerW: window.innerWidth, innerH: window.innerHeight })`,
    returnByValue: true,
  })
  console.log('APP PAGE:', vis.result?.result?.value)
  ws.close(); pageWs.close()
}
main().catch((e) => { console.error('ERR', e); process.exit(1) })
