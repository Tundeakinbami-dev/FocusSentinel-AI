export interface Reading {
  value: number | null
  confidence: number | null
  stable: boolean | null
}

export interface SignalReadings {
  breathingRate: Reading | null
  pulseRate: Reading | null
  hrv: Reading | null
}

export interface SignalHistory {
  breathingRate: number[]
  pulseRate: number[]
  hrv: number[]
}

export interface MonitoringContextType {
  status: string
  isStarting: boolean
  isMonitoring: boolean
  isSimulating: boolean
  error: string
  readings: SignalReadings
  signalHistory: SignalHistory
  mediaStream: MediaStream | null
  cameraDevices: MediaDeviceInfo[]
  selectedCameraId: string
  setSelectedCameraId: (deviceId: string) => void
  startMonitoring: () => Promise<void>
  stopMonitoring: () => Promise<void>
  toggleSimulation: () => void
}
