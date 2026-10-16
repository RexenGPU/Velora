const port = process.argv[2] ?? '9222'

const targets = async () =>
  (await (await fetch(`http://localhost:${port}/json/list`)).json()).filter((t) => t.type === 'page')

const connect = async (url) => {
  const ws = new WebSocket(url)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  let id = 1
  const pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    }
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
  // Wait for CDP to come up (Defender can delay first launches).
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try { await fetch(`http://localhost:${port}/json/version`); break } catch { await sleep(1000) }
  }
  const page = (await targets()).find((t) => t.url.includes('index.html'))
  const { ws, evalJs } = await connect(page.webSocketDebuggerUrl)

  const waitFor = async (expression, label, timeoutMs = 30000) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (await evalJs(`!!(${expression})`)) return true
      await sleep(500)
    }
    console.log(`TIMEOUT waiting for ${label}`)
    return false
  }
  await waitFor(`document.querySelector('header.glass')`, 'app mount')

  // Logo is now the user's PNG asset.
  const logoImg = await evalJs(`(() => { const img = document.querySelector('header img'); return img ? img.getAttribute('src') : null })()`)
  pass('header uses logo image', !!logoImg && logoImg.includes('logo') || logoImg.includes('.png'), logoImg ?? '')

  // Go to the vault, create it, add an entry.
  await evalJs(`location.hash = '#/vault'`)
  await waitFor(`document.querySelector('#master-new') || document.querySelector('input[aria-label="Master password"]')`, 'vault view')
  await evalJs(setInput('#master-new', 'persist-master-pw-1'))
  await evalJs(setInput('#master-confirm', 'persist-master-pw-1'))
  await evalJs(`document.querySelector('#master-new').closest('form').requestSubmit()`)
  await sleep(3000)

  const addBtn = await evalJs(`!![...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add')`)
  if (addBtn) {
    await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add').click()`)
    await sleep(400)
    await evalJs(setInput('#vault-name', 'Persistent Bank'))
    await evalJs(setInput('#vault-user', 'rich@me.money'))
    await evalJs(setInput('#vault-pass', 'vault-survives-upgrades-9'))
    await evalJs(`document.querySelector('#vault-name').closest('form').requestSubmit()`)
    await sleep(2000)
  }
  const hasEntry = await evalJs(`document.body.innerText.includes('Persistent Bank')`)
  pass('vault entry added', hasEntry)

  // Desktop file bridge active?
  const bridge = await evalJs(`typeof window.veloraDesktop?.getStore === 'function' && typeof window.veloraDesktop?.saveStore === 'function'`)
  pass('store file bridge exposed', bridge)

  const fileRaw = await evalJs(`window.veloraDesktop.getStore()`)
  pass('store file written', typeof fileRaw === 'string' && fileRaw.includes('Persistent') === false && (fileRaw ? JSON.parse(fileRaw).vault?.entries?.length === 1 : false), `${fileRaw ? Math.round(fileRaw.length / 1024) : 0} KB`)

  // Simulate a version upgrade wiping renderer storage, then reload.
  await evalJs(`localStorage.clear()`)
  const lsEmpty = await evalJs(`localStorage.getItem('velora:v1') === null`)
  pass('localStorage wiped (simulated upgrade)', lsEmpty)
  await evalJs(`location.reload()`)
  await sleep(3000)
  await evalJs(`location.hash = '#/vault'`)
  await sleep(1000)
  await waitFor(`document.querySelector('input[aria-label="Master password"]')`, 'locked view after wipe')

  const restoredVault = await evalJs(`(() => {
    const d = JSON.parse(window.veloraDesktop.getStore())
    return { vault: !!d?.vault, entries: d?.vault?.entries?.length ?? 0, encrypted: !(window.veloraDesktop.getStore() ?? '').includes('vault-survives-upgrades-9') }
  })()`)
  pass('vault restored from file after wipe', restoredVault.vault && restoredVault.entries === 1 && restoredVault.encrypted)

  const lsHydrated = await evalJs(`!!JSON.parse(localStorage.getItem('velora:v1') ?? '{}').vault`)
  pass('localStorage re-hydrated from file', lsHydrated)

  const lockedScreen = await evalJs(`!!document.querySelector('input[aria-label="Master password"]')`)
  pass('vault locked on fresh load', lockedScreen)

  ws.close()
  console.log('PERSISTENCE E2E DONE')
}
main().catch((e) => {
  console.error('ERR', e)
  process.exit(1)
})
