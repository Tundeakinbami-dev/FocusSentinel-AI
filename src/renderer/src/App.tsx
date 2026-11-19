import React, { useEffect, useState } from 'react'
import SignalMonitor from './components/SignalMonitor'
import { MonitoringProvider } from './context/MonitoringContext'
import { useMonitoring } from './context/useMonitoring'

type Page = 'Overview' | 'FocusSense' | 'Sentinel Safety' | 'Signal Monitor' | 'Privacy Centre'

function AppContent(): React.JSX.Element {
  const [activePage, setActivePage] = useState<Page>('Overview')
  const [focusActive, setFocusActive] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [checkedIn, setCheckedIn] = useState(false)
  const [safetyNotice, setSafetyNotice] = useState('')

  const { isMonitoring, isSimulating, readings, mediaStream } = useMonitoring()

  useEffect(() => {
    if (!focusActive) return

    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [focusActive])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }

  const navigation: { name: Page; icon: string }[] = [
    { name: 'Overview', icon: '◫' },
    { name: 'FocusSense', icon: '◎' },
    { name: 'Sentinel Safety', icon: '⬡' },
    { name: 'Signal Monitor', icon: '⌁' },
    { name: 'Privacy Centre', icon: '◇' }
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">F</div>
          <div>
            <h1>FocusTellisense AI</h1>
            <span>INTELLIGENCE FOR EVERYDAY LIFE</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${activePage === item.name ? 'active' : ''}`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-card">
            <span className={`status-dot ${isMonitoring || isSimulating ? 'online' : 'offline'}`} />
            <div>
              <strong>SmartSpectra</strong>
              <small>
                {isMonitoring ? 'Monitoring' : isSimulating ? 'Simulation' : 'Not connected'}
              </small>
            </div>
          </div>
          <p>FOCUSTELLISENSE AI · PREVIEW</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-right">
            <span className="privacy-indicator">
              <span
                className={`status-dot ${isMonitoring || isSimulating ? 'online' : 'offline'}`}
              />
              {isMonitoring
                ? 'Camera & Sensing Active'
                : isSimulating
                  ? 'Simulation Mode'
                  : 'Privacy controls active'}
            </span>
            <div className="avatar">FT</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-section">
            <div>
              <span className="eyebrow">FOCUSTELLISENSE AI · YOUR PERSONAL AWARENESS PLATFORM</span>
              <h2>{activePage === 'Overview' ? 'Stay aware. Stay in control.' : activePage}</h2>
              <p>Intelligent awareness for everyday living. Assistance when it matters most.</p>
            </div>
            <div className="date-chip">● YOUR PRIVATE WORKSPACE</div>
          </section>

          {activePage === 'Overview' && (
            <>
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-tag">FOCUSSENSE MODULE</span>
                  <h3>Make room for your best work.</h3>
                  <p>Start a focus session and create space for intentional, uninterrupted work.</p>
                  <button className="primary-button" onClick={() => setActivePage('FocusSense')}>
                    Open FocusSense <span>→</span>
                  </button>
                </div>
                <div className="hero-orbit">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="orbit-core">FT</div>
                  <span className="orbit-label">AWARENESS</span>
                </div>
              </section>

              <div className="section-heading">
                <div>
                  <h3>Your workspace</h3>
                  <p>Tools for focus, awareness and personal safety.</p>
                </div>
              </div>

              <section className="feature-grid">
                <article className="feature-card">
                  <div className="feature-icon purple">◎</div>
                  <span className="card-label">01 / PRODUCTIVITY</span>
                  <h3>FocusSense</h3>
                  <p>Build focus sessions and make time for restorative breaks.</p>
                  <button onClick={() => setActivePage('FocusSense')}>Explore module →</button>
                </article>

                <article className="feature-card">
                  <div className="feature-icon green">⬡</div>
                  <span className="card-label">02 / PERSONAL SAFETY</span>
                  <h3>Sentinel Safety</h3>
                  <p>Manage personal check-ins and manual emergency actions.</p>
                  <button onClick={() => setActivePage('Sentinel Safety')}>Explore module →</button>
                </article>

                <article className="feature-card">
                  <div className="feature-icon blue">⌁</div>
                  <span className="card-label">03 / SIGNALS</span>
                  <h3>Signal Monitor</h3>
                  <p>See the connection status of your Presage signal source.</p>
                  <button onClick={() => setActivePage('Signal Monitor')}>Explore module →</button>
                </article>
              </section>

              <section className="bottom-grid">
                <article className="info-card">
                  <span className="card-label">CONNECTION STATUS</span>
                  <h3>
                    <span
                      className={`status-dot ${isMonitoring || isSimulating ? 'online' : 'offline'}`}
                    />{' '}
                    SmartSpectra SDK
                  </h3>
                  <p>
                    {isMonitoring
                      ? 'Connected and actively monitoring physiological signals.'
                      : isSimulating
                        ? 'Development simulation mode active (synthetic values).'
                        : 'Waiting for SDK configuration and user permission.'}
                  </p>
                </article>
                <article className="info-card">
                  <span className="card-label">YOUR PRIVACY</span>
                  <h3>You&apos;re in control.</h3>
                  <p>Camera access and signal processing require your explicit consent.</p>
                  <button onClick={() => setActivePage('Privacy Centre')}>
                    Privacy settings →
                  </button>
                </article>
              </section>
            </>
          )}

          {activePage === 'FocusSense' && (
            <section className="module-layout">
              <article className="focus-card">
                <span className="eyebrow">FOCUS SESSION</span>
                <h3>Your time, intentionally spent.</h3>
                <p>Work at your own pace. Take a break whenever you need one.</p>
                <div className="timer">{formatTime(elapsedSeconds)}</div>
                <span className="timer-caption">
                  {focusActive ? 'SESSION IN PROGRESS' : 'SESSION PAUSED'}
                </span>
                <div className="timer-actions">
                  <button className="primary-button" onClick={() => setFocusActive(!focusActive)}>
                    {focusActive ? 'Pause session' : 'Start session'}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setFocusActive(false)
                      setElapsedSeconds(0)
                    }}
                  >
                    Reset
                  </button>
                </div>
              </article>
              <article className="info-card">
                <span className="card-label">SIGNAL AWARENESS</span>
                <h3>SmartSpectra connection</h3>
                {isMonitoring || isSimulating ? (
                  <>
                    <p style={{ marginTop: '8px', lineHeight: '1.6' }}>
                      Active sensing:{' '}
                      <strong>
                        {readings.pulseRate?.value != null
                          ? `${readings.pulseRate.value.toFixed(0)} bpm pulse`
                          : 'Acquiring pulse...'}
                      </strong>{' '}
                      ·{' '}
                      <strong>
                        {readings.breathingRate?.value != null
                          ? `${readings.breathingRate.value.toFixed(0)} br/min breathing`
                          : 'Acquiring breathing...'}
                      </strong>
                    </p>
                    <span
                      className="status-pill"
                      style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.15)',
                        color: '#15803d',
                        display: 'inline-block',
                        marginTop: '12px'
                      }}
                    >
                      {isSimulating ? '● Simulation Connected' : '● Live Sensing Active'}
                    </span>
                  </>
                ) : (
                  <>
                    <p>Not connected. No physiological signals are currently being monitored.</p>
                    <span className="status-pill">Awaiting session</span>
                  </>
                )}
              </article>
            </section>
          )}

          {activePage === 'Sentinel Safety' && (
            <section className="module-layout">
              <article className="focus-card safety-card">
                <span className="eyebrow">PERSONAL SAFETY</span>
                <h3>Your safety, your decisions.</h3>
                <p>
                  Use check-ins to confirm that you&apos;re okay. You remain in control of every
                  emergency action.
                </p>
                <div className="checkin-status">
                  <span className={`status-dot ${checkedIn ? 'online' : 'offline'}`} />
                  {checkedIn ? 'You checked in successfully.' : 'No check-in recorded yet.'}
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    setCheckedIn(true)
                    setSafetyNotice('Your check-in has been recorded locally.')
                  }}
                >
                  I&apos;m okay
                </button>
                <button
                  className="sos-button"
                  onClick={() =>
                    setSafetyNotice(
                      'SOS prototype only. No emergency services or trusted contacts have been contacted.'
                    )
                  }
                >
                  SOS · Emergency assistance
                </button>
                {safetyNotice && <p className="notice">{safetyNotice}</p>}
              </article>
              <article className="info-card">
                <span className="card-label">IMPORTANT</span>
                <h3>You remain in control.</h3>
                <p>
                  This prototype does not detect medical emergencies or automatically contact
                  anyone. Trusted contacts must be configured before real assistance workflows are
                  enabled.
                </p>
              </article>
            </section>
          )}

          {activePage === 'Signal Monitor' && <SignalMonitor />}

          {activePage === 'Privacy Centre' && (
            <section className="privacy-grid">
              <article className="info-card">
                <span className="feature-icon green">◇</span>
                <h3>Camera permission</h3>
                <p>
                  Camera access will only be requested when a feature requires it and after the user
                  gives consent.
                </p>
                <span
                  className="status-pill"
                  style={
                    mediaStream
                      ? { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#15803d' }
                      : undefined
                  }
                >
                  {mediaStream ? '● Camera Active' : 'Not active'}
                </span>
              </article>
              <article className="info-card">
                <span className="feature-icon blue">⌁</span>
                <h3>Signal processing</h3>
                <p>
                  The SDK integration processes facial micro-movements locally. Vitals are held in
                  temporary memory only.
                </p>
                <span
                  className="status-pill"
                  style={
                    isMonitoring || isSimulating
                      ? { backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#15803d' }
                      : undefined
                  }
                >
                  {isMonitoring
                    ? '● Live Processing Active'
                    : isSimulating
                      ? '● Simulation Active'
                      : 'Not active'}
                </span>
              </article>
              <article className="info-card">
                <span className="feature-icon purple">◇</span>
                <h3>Your control</h3>
                <p>You decide when to enable sensing features and when to stop a session.</p>
                <span className="status-pill">Full user control</span>
              </article>
            </section>
          )}

          <footer className="footer">
            <span>FOCUSTELLISENSE AI</span>
            <span>Awareness without intrusion.</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <MonitoringProvider>
      <AppContent />
    </MonitoringProvider>
  )
}

export default App
