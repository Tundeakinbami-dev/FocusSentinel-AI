interface SafeElectronAPI {
  process: {
    versions: {
      node?: string
      chrome?: string
      electron?: string
    }
  }
}

interface FocusSentinelAPI {
  getSmartSpectraApiKey: () => Promise<string>
}

declare global {
  interface Window {
    electron?: SafeElectronAPI
    api?: FocusSentinelAPI
    __smartspectraBridge?: unknown
  }
}

export {}
