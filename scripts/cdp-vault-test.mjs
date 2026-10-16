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
  const page = (await targets()).find((t) => !t.url.includes('toolbar.html'))
  const { ws, evalJs } = await connect(page.webSocketDebuggerUrl)

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

  // Wait for the React app to mount.
  const mounted = await waitFor(`document.querySelector('header.glass')`, 'app mount')
  if (!mounted) {
    console.log('VAULT E2E ABORTED — app never mounted')
    ws.close()
    return
  }
  console.log('App mounted.')
  const results = {}
  const pass = (k, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${k}${extra ? ' — ' + extra : ''}`)

  // Fresh state check
  const state = await evalJs(`(() => { try { const d = JSON.parse(localStorage.getItem('velora:v1') ?? '{}'); return { hasVault: !!d.vault, pw: localStorage.getItem('velora:v1') ?? '' } } catch { return { hasVault: false, pw: '' } } })()`)
  if (state.hasVault) {
    console.log('A vault already exists in this profile — creation test skipped; testing unlock with known password only if it was created by a previous run.')
  }

  await evalJs(`location.hash = '#/vault'`)
  await waitFor(`document.querySelector('#master-new') || document.body.innerText.includes('Vault locked')`, 'vault view')

  // 1. Create vault
  if (!state.hasVault) {
    const filled1 = await evalJs(setInput('#master-new', 'test-master-pw-123'))
    const filled2 = await evalJs(setInput('#master-confirm', 'test-master-pw-123'))
    pass('create form present', filled1 && filled2)
    await evalJs(`document.querySelector('#master-new').closest('form').requestSubmit()`)
    await sleep(2500) // PBKDF2 310k + render
    const v = await evalJs(`(() => { const d = JSON.parse(localStorage.getItem('velora:v1')); return d?.vault ?? null })()`)
    pass('vault persisted', !!v?.salt && !!v?.verifier?.data, `salt ${v?.salt?.length ?? 0} chars`)
    results.created = true
  }

  // 2. Add an entry
  await sleep(500)
  const unlockedNow = await evalJs(`!!document.querySelector('input#vault-name') || document.body.innerText.includes('Add password')`)
  if (unlockedNow || results.created) {
    const addBtn = await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add')?.click() ?? false`)
    await sleep(400)
    const f1 = await evalJs(setInput('#vault-name', 'Example Mail'))
    const f2 = await evalJs(setInput('#vault-user', 'me@example.org'))
    const f3 = await evalJs(setInput('#vault-pass', 'secret-hunter-2!'))
    pass('entry form filled', f1 && f2 && f3)
    await evalJs(`document.querySelector('#vault-name').closest('form').requestSubmit()`)
    await sleep(1500)
    const after = await evalJs(`(() => { const d = JSON.parse(localStorage.getItem('velora:v1')); return { n: d?.vault?.entries?.length ?? 0, raw: localStorage.getItem('velora:v1') ?? '' } })()`)
    pass('entry encrypted & stored', after.n === 1, `${after.n} entries`)
    pass('plaintext password absent from storage', !after.raw.includes('secret-hunter-2!'))
  }

  // 3. Reload → locked
  await evalJs(`location.reload()`)
  await sleep(2500)
  const lockedUrl = await evalJs(`location.hash = '#/vault'; 'ok'`)
  await sleep(600)
  const locked = await evalJs(`!!document.querySelector('input[aria-label="Master password"]')`)
  pass('locked after reload', locked)
  await console.log(`(url: ${lockedUrl})`)

  // 4. Unlock with wrong password
  await evalJs(setInput('input[aria-label="Master password"]', 'wrong-password'))
  await evalJs(`document.querySelector('input[aria-label="Master password"]').closest('form').requestSubmit()`)
  await sleep(1500)
  const wrongRejected = await evalJs(`document.body.innerText.includes('Wrong master password')`)
  pass('wrong password rejected', wrongRejected)

  // 5. Unlock with right password
  await evalJs(setInput('input[aria-label="Master password"]', 'test-master-pw-123'))
  await evalJs(`document.querySelector('input[aria-label="Master password"]').closest('form').requestSubmit()`)
  await sleep(2000)
  const entryVisible = await evalJs(`document.body.innerText.includes('Example Mail') && document.body.innerText.includes('me@example.org')`)
  pass('unlock decrypts entry', entryVisible)

  ws.close()
  console.log('VAULT E2E DONE')
}

main().catch((e) => {
  console.error('E2E ERROR:', e)
  process.exit(1)
})
