const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('veloraDesktop', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
  saveStore: (json) => ipcRenderer.send('store:save', json),
  getStore: () => ipcRenderer.sendSync('store:get'),
  clearStore: () => ipcRenderer.send('store:clear'),
  sendAutologin: (tabId, payload) => ipcRenderer.send('autologin:fill', { tabId, ...payload }),
})

ipcRenderer.on('win:maximized', (_event, value) => {
  window.dispatchEvent(new CustomEvent('velora:maximized', { detail: value }))
})

ipcRenderer.on('chrome:layout', (_event, detail) => {
  window.dispatchEvent(new CustomEvent('velora:layout', { detail }))
})

ipcRenderer.on('autologin:request', (_event, detail) => {
  window.dispatchEvent(new CustomEvent('velora:autologin', { detail }))
})
