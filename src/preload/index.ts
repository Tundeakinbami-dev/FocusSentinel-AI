import { contextBridge, ipcRenderer } from 'electron'

import '@smartspectra/node-sdk/preload'

// Safe, restricted subset of electron metadata (excluding raw ipcRenderer and process.env)
const safeElectron = {
  process: {
    versions: {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron
    }
  }
}

// Custom APIs for renderer
const api = {
  getSmartSpectraApiKey: (): Promise<string> => ipcRenderer.invoke('smartspectra:get-api-key')
}

// Ensure context isolation is active before exposing APIs
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', safeElectron)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('[Security] Failed to expose contextBridge APIs:', error)
  }
} else {
  throw new Error('[Security] FocusSentinel requires context isolation to be enabled.')
}
