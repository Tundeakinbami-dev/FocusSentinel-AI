import React, { useState, useEffect, useRef } from 'react'
import { useMonitoring } from '../context/useMonitoring'
import { Reading } from '../context/types'

function SignalMonitor(): React.JSX.Element {
  const {
    status,
    isStarting,
    isMonitoring,
    isSimulating,
    error,
    validationHint,
    readings,
    signalHistory,
    mediaStream,
    cameraDevices,
    selectedCameraId,
    setSelectedCameraId,
    startMonitoring,
    stopMonitoring,
    toggleSimulation,
    sessionElapsed,
    sessionDuration,
    isSessionComplete,
    resetSession
  } = useMonitoring()

  const [brightness, setBrightness] = useState<number>(135)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Attach active media stream to local preview video element
  useEffect(() => {
    const video = videoRef.current
    if (video && mediaStream) {
      video.srcObject = mediaStream
      void video.play().catch(() => {})
    } else if (video) {
      video.srcObject = null
    }

    return () => {
      if (video) {
        video.srcObject = null
      }
    }
  }, [mediaStream])

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
      // Realistic baseline window: at least 10 bpm for pulse, 4 br/min for breathing, 15 ms for HRV
      const minRange = type === 'pulse' ? 10 : type === 'breathing' ? 4 : 15
      const range = Math.max(max - min, minRange)
      const midpoint = (max + min) / 2
      const baselineMin = midpoint - range / 2

      const points = history
        .map((value, index) => {
          const x = history.length === 1 ? 150 : (index / (history.length - 1)) * 300
          const y = 55 - ((value - baselineMin) / range) * 45
          return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')

      return (
        <div className="signal-dynamic-chart-wrapper">
          <svg
            viewBox="0 0 300 65"
            className="signal-dynamic-chart"
            role="img"
            aria-label={`${label} real-time trend`}
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
          {isActive && (
            <span
              className={`status-pill ${reading?.stable ? 'pill-stable' : 'pill-calibrating'}`}
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                backgroundColor: reading?.stable
                  ? 'rgba(34, 197, 94, 0.15)'
                  : 'rgba(234, 179, 8, 0.15)',
                color: reading?.stable ? '#15803d' : '#a16207',
                borderRadius: '12px'
              }}
            >
              {isSessionComplete ? '● Captured' : reading?.stable ? '● Stable' : '○ Calibrating'}
            </span>
          )}
        </div>

        {renderGraph()}

        <div className="signal-reading-value">
          {isActive ? (
            <>
              {reading?.value?.toFixed(1)} <span>{unit}</span>
            </>
          ) : (
            'Waiting for data'
          )}
        </div>

        {isActive && reading?.confidence != null && (
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Quality: {Math.round(reading.confidence)}% confidence
          </div>
        )}

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
          <span className={`status-dot ${isMonitoring || isSimulating ? 'online' : 'offline'}`} />
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

        {cameraDevices.length > 1 && (
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="camera-select"
              style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '6px' }}
            >
              Select Camera:
            </label>
            <select
              id="camera-select"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={isMonitoring || isStarting}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontSize: '13px'
              }}
            >
              {cameraDevices.map((dev) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Camera ${dev.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {isMonitoring && (
          <div className="signal-session-progress">
            <div className="session-progress-header">
              <span>
                Capturing vitals:{' '}
                <strong>
                  {sessionElapsed}s / {sessionDuration}s
                </strong>
              </span>
              <span>{Math.round((sessionElapsed / sessionDuration) * 100)}%</span>
            </div>
            <div className="session-progress-track">
              <div
                className="session-progress-fill"
                style={{ width: `${Math.min(100, (sessionElapsed / sessionDuration) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {isSessionComplete && (
          <div className="signal-session-complete-banner">
            <span className="complete-badge">✓ Captured</span>
            <span>
              Static physiological readings finalized after {sessionDuration}s. Camera stopped.
            </span>
          </div>
        )}

        <div className="signal-actions">
          {isSessionComplete ? (
            <>
              <button
                className="primary-button"
                onClick={() => void startMonitoring()}
                disabled={isStarting}
              >
                Start new monitoring session
              </button>
              <button className="secondary-button" onClick={resetSession}>
                Clear results
              </button>
              <button className="secondary-button" onClick={toggleSimulation}>
                Start simulation
              </button>
            </>
          ) : isMonitoring ? (
            <>
              <button className="primary-button" onClick={() => void stopMonitoring(true)}>
                Capture & finish early
              </button>
              <button className="secondary-button" onClick={() => void stopMonitoring(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="primary-button"
                onClick={() => void startMonitoring()}
                disabled={isStarting || isMonitoring || isSimulating}
              >
                {isStarting ? 'Connecting...' : 'Start live monitoring'}
              </button>

              <button
                className="secondary-button"
                onClick={() => void stopMonitoring(false)}
                disabled={!isMonitoring && !isStarting}
              >
                Stop live monitoring
              </button>

              <button
                className="secondary-button"
                onClick={toggleSimulation}
                disabled={isMonitoring || isStarting}
              >
                {isSimulating ? 'Stop simulation' : 'Start simulation'}
              </button>
            </>
          )}
        </div>

        {error && <p className="signal-error">{error}</p>}
      </article>

      <article className="info-card signal-preview-card">
        <span className="card-label">CAMERA PREVIEW</span>

        <video
          ref={videoRef}
          className="signal-video"
          autoPlay
          muted
          playsInline
          style={{
            filter: `brightness(${brightness}%) contrast(1.06)`,
            transform: 'scaleX(-1)'
          }}
        />

        {validationHint && (
          <div className="signal-validation-alert" role="status">
            <span className="validation-alert-dot">●</span>
            {validationHint}
          </div>
        )}

        <div className="camera-preview-footer">
          <p className="signal-reading-waiting">
            {mediaStream
              ? 'Camera active · Live monitoring in progress'
              : isSessionComplete
                ? 'Camera stopped · Results locked in'
                : 'The preview is active only during a monitoring session.'}
          </p>

          {mediaStream && (
            <div className="camera-brightness-controls">
              <div className="brightness-header">
                <span className="brightness-label">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                  Brightness: <strong>{brightness}%</strong>
                </span>
                <div className="brightness-presets">
                  {[100, 135, 170, 200].map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={`brightness-preset-btn ${brightness === level ? 'is-active' : ''}`}
                      onClick={() => setBrightness(level)}
                    >
                      {level === 100
                        ? '1x'
                        : level === 135
                          ? 'Boost'
                          : level === 170
                            ? 'High'
                            : 'Max'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="80"
                max="220"
                step="5"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="brightness-range-slider"
                aria-label="Adjust camera preview brightness"
              />
            </div>
          )}
        </div>
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
        {renderReading('PULSE RATE', readings.pulseRate, 'bpm', signalHistory.pulseRate, 'pulse')}
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
          describe signal quality, not the likelihood of a medical emergency. FocusTellisense AI
          does not automatically contact emergency services based on these readings.
        </p>
      </article>
    </section>
  )
}

export default SignalMonitor
