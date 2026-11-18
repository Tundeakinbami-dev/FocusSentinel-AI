import { ElectronAPI } from '@electron-toolkit/preload'

interface FocusSentinelAPI {
  getSmartSpectraApiKey: () => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: FocusSentinelAPI
  }
}
