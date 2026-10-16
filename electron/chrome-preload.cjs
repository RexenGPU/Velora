const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('veloraChrome', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
  newTab: () => ipcRenderer.send('tab:new'),
  activateTab: (id) => ipcRenderer.send('tab:activate', id),
  closeTab: (id) => ipcRenderer.send('tab:close', id),
  setSidebarHover: (hovered) => ipcRenderer.send('sidebar:hover', hovered),
  navBack: () => ipcRenderer.send('nav:back'),
  navForward: () => ipcRenderer.send('nav:forward'),
  navReload: () => ipcRenderer.send('nav:reload'),
  navHome: () => ipcRenderer.send('nav:home'),
  navExternal: () => ipcRenderer.send('nav:external'),
})

ipcRenderer.on('win:maximized', (_event, value) => {
  window.dispatchEvent(new CustomEvent('velora:maximized', { detail: value }))
})

ipcRenderer.on('tabs:changed', (_event, tabs) => {
  window.dispatchEvent(new CustomEvent('velora:tabs', { detail: tabs }))
})

ipcRenderer.on('nav:state', (_event, state) => {
  window.dispatchEvent(new CustomEvent('velora:navstate', { detail: state }))
})
