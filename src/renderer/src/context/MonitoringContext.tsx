import React, { useEffect, useRef, useState } from 'react'
import { SmartSpectraSDK, breathingMetrics, cardioMetrics } from '@smartspectra/node-sdk/renderer'
import { decodeMetrics } from '@smartspectra/node-sdk/messages'
import { MonitoringContext } from './context'
import { Reading, SignalReadings, SignalHistory, MonitoringContextType } from './types'

const emptyReadings: SignalReadings = {
  breathingRate: null,
  pulseRate: null,
  hrv: null
}

const initialHistory: SignalHistory = {
  breathingRate: [],
  pulseRate: [],
  hrv: []
}

function getLatestReading(
  values:
    | {
        value?: number | null
        confidence?: number | null
        stable?: boolean | null
      }[]
    | null
    | undefined
): Reading | null {
  if (!values || values.length === 0) return null

  const latest = values[values.length - 1]

  return {
    value: latest.value ?? null,
    confidence: latest.confidence ?? null,
    stable: latest.stable ?? null
  }
}

export function MonitoringProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const sdkRef = useRef<SmartSpectraSDK | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState<string>('Not connected')
  const [isStarting, setIsStarting] = useState<boolean>(false)
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false)
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [readings, setReadings] = useState<SignalReadings>(emptyReadings)
  const [signalHistory, setSignalHistory] = useState<SignalHistory>(initialHistory)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')

  // Enumerate available cameras
  useEffect(() => {
    if (navigator?.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((device) => device.kind === 'videoinput')
          setCameraDevices(videoInputs)
          if (videoInputs.length > 0 && !selectedCameraId) {
            setSelectedCameraId(videoInputs[0].deviceId)
          }
        })
        .catch(() => {
          // Device enumeration permission error or unavailable
        })
    }
  }, [selectedCameraId])

  // Application teardown cleanup
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      setMediaStream(null)

      const sdk = sdkRef.current
      sdkRef.current = null
      if (sdk) {
        sdk.destroy()
      }
    }
  }, [])

  // Development simulation generator
  useEffect(() => {
    if (!isSimulating) return

    const generateReadings = (): void => {
      const breathingRate = Number((12 + Math.random() * 6).toFixed(1))
      const pulseRate = Number((65 + Math.random() * 20).toFixed(1))
      const hrv = Number((25 + Math.random() * 35).toFixed(1))

      setReadings({
        breathingRate: { value: breathingRate, confidence: 96, stable: true },
        pulseRate: { value: pulseRate, confidence: 95, stable: true },
        hrv: { value: hrv, confidence: 92, stable: true }
      })

      setSignalHistory((previous) => ({
        breathingRate: [...previous.breathingRate, breathingRate].slice(-20),
        pulseRate: [...previous.pulseRate, pulseRate].slice(-20),
        hrv: [...previous.hrv, hrv].slice(-20)
      }))
    }

    generateReadings()
    const intervalId = window.setInterval(generateReadings, 2000)

    return () => window.clearInterval(intervalId)
  }, [isSimulating])

  const startMonitoring = async (): Promise<void> => {
    if (isSimulating) {
      setIsSimulating(false)
    }

    setError('')
    setReadings(emptyReadings)
    setIsStarting(true)
    setStatus('Connecting to SmartSpectra...')

    try {
      const apiKey = await window.api.getSmartSpectraApiKey()

      const sdk = new SmartSpectraSDK({
        apiKey,
        requestedMetrics: [...breathingMetrics, ...cardioMetrics],
        enableTelemetry: false
      })

      sdkRef.current = sdk

      sdk.on('processingStatus', (procStatus) => {
        console.info('[SmartSpectra] Processing status:', procStatus)
      })

      sdk.on('validationStatus', (code, timestampUs, hint) => {
        console.info('[SmartSpectra] Validation status:', { code, timestampUs, hint })
      })

      sdk.on('frameSentThrough', (sent, timestampUs) => {
        console.info('[SmartSpectra] Frame sent through:', { sent, timestampUs })
      })

      sdk.on('streamAvailable', (stream) => {
        mediaStreamRef.current = stream
        setMediaStream(stream)
      })

      sdk.on('metrics', (buffer) => {
        try {
          const metrics = decodeMetrics(buffer)
          const latestHrv = metrics.cardio?.hrv
          const hrvSample =
            latestHrv && latestHrv.length > 0 ? latestHrv[latestHrv.length - 1] : null

          const latestBreathing = getLatestReading(metrics.breathing?.rate)
          const latestPulse = getLatestReading(metrics.cardio?.pulseRate)
          const latestHrvReading = hrvSample
            ? {
                value: hrvSample.rmssd ?? null,
                confidence: hrvSample.confidence ?? null,
                stable: hrvSample.stable ?? null
              }
            : null

          setReadings({
            breathingRate: latestBreathing,
            pulseRate: latestPulse,
            hrv: latestHrvReading
          })

          setSignalHistory((prev) => ({
            breathingRate:
              latestBreathing?.value != null
                ? [...prev.breathingRate, latestBreathing.value].slice(-20)
                : prev.breathingRate,
            pulseRate:
              latestPulse?.value != null
                ? [...prev.pulseRate, latestPulse.value].slice(-20)
                : prev.pulseRate,
            hrv:
              latestHrvReading?.value != null
                ? [...prev.hrv, latestHrvReading.value].slice(-20)
                : prev.hrv
          }))
        } catch (caughtError) {
          console.error('[SmartSpectra] Metrics decoding failed:', caughtError)
          setError('A signal update could not be interpreted. Monitoring can continue.')
        }
      })

      sdk.on('error', (_code, message) => {
        setError(message || 'SmartSpectra reported an error.')
        setStatus('Connection error')
      })

      // If user selected a specific camera device, attach it
      if (selectedCameraId && navigator?.mediaDevices?.getUserMedia) {
        try {
          const customStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: selectedCameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            }
          })
          sdk.useMediaStream(customStream)
          mediaStreamRef.current = customStream
          setMediaStream(customStream)
        } catch {
          // If specific device request fails, proceed with default acquire
        }
      }

      await sdk.start()

      setIsMonitoring(true)
      setStatus('Monitoring')
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to start SmartSpectra monitoring.'

      setError(message)
      setStatus('Not connected')

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      setMediaStream(null)

      const sdk = sdkRef.current
      sdkRef.current = null
      if (sdk) {
        sdk.destroy()
      }
    } finally {
      setIsStarting(false)
    }
  }

  const stopMonitoring = async (): Promise<void> => {
    const sdk = sdkRef.current
    if (!sdk) return

    setStatus('Stopping...')
    setError('')

    try {
      await sdk.stop()
    } catch {
      setError('The monitoring session did not stop cleanly.')
    } finally {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      setMediaStream(null)

      sdk.destroy()
      sdkRef.current = null

      setIsMonitoring(false)
      setStatus('Not connected')
      setReadings(emptyReadings)
    }
  }

  const toggleSimulation = (): void => {
    if (isSimulating) {
      setIsSimulating(false)
      setStatus('Simulation stopped')
      setReadings(emptyReadings)
    } else {
      if (isMonitoring) {
        void stopMonitoring()
      }
      setError('')
      setIsSimulating(true)
      setStatus('Simulation active')
    }
  }

  const value: MonitoringContextType = {
    status,
    isStarting,
    isMonitoring,
    isSimulating,
    error,
    readings,
    signalHistory,
    mediaStream,
    cameraDevices,
    selectedCameraId,
    setSelectedCameraId,
    startMonitoring,
    stopMonitoring,
    toggleSimulation
  }

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>
}
