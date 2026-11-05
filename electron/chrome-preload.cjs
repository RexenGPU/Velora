const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('veloraChrome', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  restore: () => ipcRenderer.send('win:restore'),
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
  openDownload: (id) => ipcRenderer.send('downloads:open', id),
  revealDownload: (id) => ipcRenderer.send('downloads:reveal', id),
  removeDownload: (id) => ipcRenderer.send('downloads:remove', id),
  clearDownloads: () => ipcRenderer.send('downloads:clear'),
})

const forward = (channel, eventName) => {
  ipcRenderer.on(channel, (_event, detail) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }))
  })
}

forward('win:maximized', 'velora:maximized')
forward('tabs:changed', 'velora:tabs')
forward('nav:state', 'velora:navstate')
forward('downloads:changed', 'velora:downloads')
forward('update:status', 'velora:update')
