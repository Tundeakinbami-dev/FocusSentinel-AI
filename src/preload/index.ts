import { contextBridge, ipcRenderer } from 'electron'

import '@smartspectra/node-sdk/preload'

// Safe, restricted subset of electron metadata (excluding raw ipcRenderer and process.env)
const safeElectron = {
  process: {
    versions: {
      node: process.versions?.node,
      chrome: process.versions?.chrome,
      electron: process.versions?.electron
    }
  }
}

// Custom APIs for renderer
const api = {
  getSmartSpectraApiKey: (): Promise<string> => ipcRenderer.invoke('smartspectra:get-api-key')
}

// Ensure APIs are reliably exposed across isolated and fallback contexts
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('[Security] Failed to expose api via contextBridge:', error)
  }

  try {
    contextBridge.exposeInMainWorld('electron', safeElectron)
  } catch (error) {
    console.error('[Security] Failed to expose electron via contextBridge:', error)
  }
} else {
  try {
    // @ts-ignore (fallback when context isolation is disabled or in test environments)
    window.api = api
    // @ts-ignore (fallback when context isolation is disabled or in test environments)
    window.electron = safeElectron
  } catch (error) {
    console.error('[Security] Failed to assign window.api directly:', error)
  }
}
