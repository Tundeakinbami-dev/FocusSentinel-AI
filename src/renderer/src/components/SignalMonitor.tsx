import { useEffect, useRef, useState } from 'react'
import { SmartSpectraSDK, breathingMetrics, cardioMetrics } from '@smartspectra/node-sdk/renderer'
import { decodeMetrics } from '@smartspectra/node-sdk/messages'

interface Reading {
  value: number | null
  confidence: number | null
  stable: boolean | null
}

interface SignalReadings {
  breathingRate: Reading | null
  pulseRate: Reading | null
  hrv: Reading | null
}

const emptyReadings: SignalReadings = {
  breathingRate: null,
  pulseRate: null,
  hrv: null
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

function SignalMonitor(): React.JSX.Element {
  const sdkRef = useRef<SmartSpectraSDK | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState('Not connected')
  const [isStarting, setIsStarting] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState('')
  const [readings, setReadings] = useState<SignalReadings>(emptyReadings)
  const [isSimulating, setIsSimulating] = useState(false)
  const [signalHistory, setSignalHistory] = useState({
    breathingRate: [] as number[],
    pulseRate: [] as number[],
    hrv: [] as number[]
  })

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }

      const sdk = sdkRef.current
      sdkRef.current = null

      if (sdk) {
        sdk.destroy()
      }
    }
  }, [])

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

      sdk.on('processingStatus', (status) => {
        console.info('[SmartSpectra] Processing status:', status)
      })

      sdk.on('validationStatus', (code, timestampUs, hint) => {
        console.info('[SmartSpectra] Validation status:', {
          code,
          timestampUs,
          hint
        })
      })

      sdk.on('frameSentThrough', (sent, timestampUs) => {
        console.info('[SmartSpectra] Frame sent through:', {
          sent,
          timestampUs
        })
      })

      sdk.on('streamAvailable', (stream) => {
        mediaStreamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream

          void videoRef.current.play().catch(() => {
            setError('The camera preview could not start. Check camera permissions.')
          })
        }
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

      sdk.destroy()
      sdkRef.current = null

      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      setIsMonitoring(false)
      setStatus('Not connected')
      setReadings(emptyReadings)
    }
  }

  const renderReading = (
    label: string,
    reading: Reading | null,
    unit: string,
    history: number[],
    type: 'breathing' | 'pulse' | 'hrv'
  ): React.JSX.Element => {
    const isActive = reading?.value !== null && reading?.value !== undefined

    const renderGraph = (): React.JSX.Element => {
      if (history.length === 0) {
        return (
          <div className="signal-dynamic-chart-wrapper is-waiting">
            <svg
              viewBox="0 0 300 65"
              className="signal-dynamic-chart"
              role="img"
              aria-label={`${label} waiting for data`}
            >
              <line
                x1="0"
                y1="32.5"
                x2="300"
                y2="32.5"
                stroke="rgba(78, 232, 197, 0.3)"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            </svg>
          </div>
        )
      }

      const min = Math.min(...history)
      const max = Math.max(...history)
      const range = max - min || 1

      const points = history
        .map((value, index) => {
          const x = history.length === 1 ? 150 : (index / (history.length - 1)) * 300
          const y = 55 - ((value - min) / range) * 45
          return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')

      return (
        <div className="signal-dynamic-chart-wrapper">
          <svg
            viewBox="0 0 300 65"
            className="signal-dynamic-chart"
            role="img"
            aria-label={`${label} real-time graph`}
          >
            <polyline
              points={points}
              fill="none"
              stroke="#4ee8c5"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )
    }

    return (
      <article className={`signal-reading reading-${type} ${isActive ? 'is-active' : ''}`}>
        <div className="signal-reading-header">
          <span className="card-label">{label}</span>
        </div>

        {renderGraph()}

        <div className="signal-reading-value">
          {isActive ? (
            <>
              {reading.value?.toFixed(1)} <span>{unit}</span>
            </>
          ) : (
            'Waiting for data'
          )}
        </div>

        {!isActive && (
          <p className="signal-reading-waiting">A reading will appear when the SDK provides one.</p>
        )}
      </article>
    )
  }

  return (
    <section className="signal-monitor-layout">
      <article className="info-card signal-card">
        <span className="eyebrow">PRESAGE SMARTSPECTRA</span>

        <div className="large-status">
          <span className={`status-dot ${isMonitoring ? 'online' : 'offline'}`} />
          {status}
        </div>
        {(isSimulating || status === 'Simulation stopped') && (
          <span className="eyebrow" style={{ color: '#d97706' }}>
            DEVELOPMENT SIMULATION · NOT LIVE DATA
          </span>
        )}

        <h3>Live physiological signal monitoring</h3>

        <p>
          Start a session when you are ready. Your camera is used to collect signal measurements
          while monitoring is active.
        </p>

        <div className="signal-actions">
          <button
            className="primary-button"
            onClick={startMonitoring}
            disabled={isStarting || isMonitoring || isSimulating}
          >
            {isStarting ? 'Connecting...' : 'Start live monitoring'}
          </button>

          <button
            className="secondary-button"
            onClick={stopMonitoring}
            disabled={!isMonitoring && !isStarting}
          >
            Stop live monitoring
          </button>

          <button
            className="secondary-button"
            onClick={() => {
              if (isSimulating) {
                setIsSimulating(false)
                setStatus('Simulation stopped')
              } else {
                setError('')
                setReadings(emptyReadings)
                setStatus('Development simulation')
                setIsSimulating(true)
              }
            }}
            disabled={isMonitoring || isStarting}
          >
            {isSimulating ? 'Stop simulation' : 'Start simulation'}
          </button>
        </div>

        {error && <p className="signal-error">{error}</p>}
      </article>

      <article className="info-card signal-preview-card">
        <span className="card-label">CAMERA PREVIEW</span>

        <video ref={videoRef} className="signal-video" autoPlay muted playsInline />

        <p className="signal-reading-waiting">
          The preview is active only during a monitoring session.
        </p>
      </article>

      <div className="signal-readings-grid">
        {(isSimulating || status === 'Simulation stopped') && (
          <div className="signal-error signal-simulated-banner">
            SIMULATED DATA: These values are generated for development testing only. They are not
            live physiological measurements.
          </div>
        )}
        {renderReading(
          'BREATHING RATE',
          readings.breathingRate,
          'br/min',
          signalHistory.breathingRate,
          'breathing'
        )}
        {renderReading(
          'PULSE RATE',
          readings.pulseRate,
          'bpm',
          signalHistory.pulseRate,
          'pulse'
        )}
        {renderReading(
          'HEART RATE VARIABILITY · RMSSD',
          readings.hrv,
          'ms',
          signalHistory.hrv,
          'hrv'
        )}
      </div>

      <article className="info-card signal-disclaimer">
        <span className="card-label">UNDERSTANDING THESE READINGS</span>

        <p>
          These are sensor-derived measurements, not medical diagnoses. Confidence and stability
          describe signal quality, not the likelihood of a medical emergency. Focus Sentinel does
          not automatically contact emergency services based on these readings.
        </p>
      </article>
    </section>
  )
}

export default SignalMonitor
