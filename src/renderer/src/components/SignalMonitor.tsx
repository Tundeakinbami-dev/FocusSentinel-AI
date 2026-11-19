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

  const [status, setStatus] = useState('Not connected')
  const [isStarting, setIsStarting] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState('')
  const [readings, setReadings] = useState<SignalReadings>(emptyReadings)
  const [isSimulating, setIsSimulating] = useState(false)

  useEffect(() => {
    return () => {
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
      setReadings({
        breathingRate: {
          value: Number((12 + Math.random() * 6).toFixed(1)),
          confidence: 96,
          stable: true
        },
        pulseRate: {
          value: Number((65 + Math.random() * 20).toFixed(1)),
          confidence: 95,
          stable: true
        },
        hrv: {
          value: Number((25 + Math.random() * 35).toFixed(1)),
          confidence: 92,
          stable: true
        }
      })
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
        const videoTrack = stream.getVideoTracks()[0]
        const settings = videoTrack?.getSettings()
        const capabilities = videoTrack?.getCapabilities()
        const cameraControls = capabilities as Record<string, unknown> | undefined

        console.info('FocusSentinel camera diagnostics:', {
          currentSettings: settings,
          supportedControls: {
            brightness: cameraControls?.brightness,
            contrast: cameraControls?.contrast,
            exposureMode: cameraControls?.exposureMode,
            exposureCompensation: cameraControls?.exposureCompensation,
            exposureTime: cameraControls?.exposureTime,
            whiteBalanceMode: cameraControls?.whiteBalanceMode
          }
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream

          void videoRef.current.play().catch(() => {
            setError('The camera preview could not start. Check camera permissions.')
          })
        }
      })

      // Count packets across metrics events.
      let metricsPacketCount = 0

      sdk.on('metrics', (buffer, timestampUs) => {
        console.info('[SmartSpectra] Metrics received:', {
          byteLength: buffer.length,
          timestampUs
        })

        try {
          const metrics = decodeMetrics(buffer)

          metricsPacketCount += 1

          // Log a snapshot every 100 decoded packets.
          if (metricsPacketCount <= 3) {
            console.info('[SmartSpectra] Decoded metric snapshot:', {
              breathingRateCount: metrics.breathing?.rate?.length ?? 0,
              latestBreathing:
                metrics.breathing?.rate?.[(metrics.breathing?.rate?.length ?? 0) - 1] ?? null,

              pulseRateCount: metrics.cardio?.pulseRate?.length ?? 0,
              latestPulse:
                metrics.cardio?.pulseRate?.[(metrics.cardio?.pulseRate?.length ?? 0) - 1] ?? null,

              hrvCount: metrics.cardio?.hrv?.length ?? 0,
              latestHrv: metrics.cardio?.hrv?.[(metrics.cardio?.hrv?.length ?? 0) - 1] ?? null
            })
          }

          const latestHrv = metrics.cardio?.hrv

          const hrvSample =
            latestHrv && latestHrv.length > 0 ? latestHrv[latestHrv.length - 1] : null

          setReadings({
            breathingRate: getLatestReading(metrics.breathing?.rate),
            pulseRate: getLatestReading(metrics.cardio?.pulseRate),
            hrv: hrvSample
              ? {
                  value: hrvSample.rmssd ?? null,
                  confidence: hrvSample.confidence ?? null,
                  stable: hrvSample.stable ?? null
                }
              : null
          })
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

  const formatValue = (value: number | null): string => {
    return value === null ? 'Waiting for data' : value.toFixed(1)
  }

  const renderReading = (
    label: string,
    reading: Reading | null,
    unit: string
  ): React.JSX.Element => (
    <article className="signal-reading">
      <span className="card-label">{label}</span>

      <div className="signal-reading-value">
        {formatValue(reading?.value ?? null)}
        {reading?.value !== null && reading?.value !== undefined && <span>{unit}</span>}
      </div>

      {reading ? (
        <div className="signal-reading-meta">
          <span>
            Confidence:{' '}
            {reading.confidence === null ? 'Not available' : `${reading.confidence.toFixed(0)}%`}
          </span>

          <span>
            {reading.stable === null
              ? 'Stability unknown'
              : reading.stable
                ? 'Stable'
                : 'Not yet stable'}
          </span>
        </div>
      ) : (
        <p className="signal-reading-waiting">A reading will appear when the SDK provides one.</p>
      )}
    </article>
  )

  return (
    <section className="signal-monitor-layout">
      <article className="info-card signal-card">
        <span className="eyebrow">PRESAGE SMARTSPECTRA</span>

        <div className="large-status">
          <span className={`status-dot ${isMonitoring ? 'online' : 'offline'}`} />
          {status}
        </div>

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
        {isSimulating && (
          <div className="signal-error">
            SIMULATED DATA: These values are generated for development testing only. They are not
            live physiological measurements.
          </div>
        )}
        {renderReading('BREATHING RATE', readings.breathingRate, 'br/min')}
        {renderReading('PULSE RATE', readings.pulseRate, 'bpm')}
        {renderReading('HEART RATE VARIABILITY · RMSSD', readings.hrv, 'ms')}
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
