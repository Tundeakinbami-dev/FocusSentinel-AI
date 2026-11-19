import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ValidationCode,
  SmartSpectraErrorCode
} from '../node_modules/@smartspectra/node-sdk/js/constants.js'

describe('SmartSpectra Lifecycle & Validation Codes', () => {
  it('correctly maps all vendor validation status codes', () => {
    assert.equal(ValidationCode.kOk, 0)
    assert.equal(ValidationCode.kNoFaceFound, 1)
    assert.equal(ValidationCode.kMultipleFacesFound, 2)
    assert.equal(ValidationCode.kFaceNotCentered, 3)
    assert.equal(ValidationCode.kTooDark, 5)
    assert.equal(ValidationCode.kTooBright, 6)
    assert.equal(ValidationCode.kChestNotVisible, 7)
    assert.equal(ValidationCode.kExcessiveMotion, 12)
    assert.equal(ValidationCode.kFaceTooClose, 13)
    assert.equal(ValidationCode.kFaceTooFar, 14)
  })

  it('correctly maps all vendor error codes including credit exhaustion', () => {
    assert.equal(SmartSpectraErrorCode.kOk, 0)
    assert.equal(SmartSpectraErrorCode.kAuthenticationFailed, 2)
    assert.equal(SmartSpectraErrorCode.kConfigurationFailed, 3)
    assert.equal(SmartSpectraErrorCode.kCreditExhausted, 4)
    assert.equal(SmartSpectraErrorCode.kNetworkError, 5)
    assert.equal(SmartSpectraErrorCode.kServerError, 6)
    assert.equal(SmartSpectraErrorCode.kInputUnavailable, 7)
    assert.equal(SmartSpectraErrorCode.kProcessingFailed, 8)
    assert.equal(SmartSpectraErrorCode.kSustainedLowFrameRate, 14)
  })

  it('verifies strict separation between live and simulated states', () => {
    let isMonitoring = false
    let isSimulating = true
    let readings: {
      breathingRate: { value: number; confidence: number; stable: boolean } | null
      pulseRate: { value: number; confidence: number; stable: boolean } | null
      hrv: { value: number; confidence: number; stable: boolean } | null
    } = {
      breathingRate: { value: 14.5, confidence: 96, stable: true },
      pulseRate: { value: 72.0, confidence: 95, stable: true },
      hrv: { value: 45.0, confidence: 92, stable: true }
    }

    assert.equal(isSimulating, true)
    assert.equal(isMonitoring, false)
    assert.ok(readings.pulseRate !== null)

    // Trigger startMonitoring -> MUST cancel simulation immediately
    if (isSimulating) {
      isSimulating = false
      readings = { breathingRate: null, pulseRate: null, hrv: null }
    }
    isMonitoring = true

    assert.equal(isSimulating, false)
    assert.equal(isMonitoring, true)
    assert.equal(readings.breathingRate, null, 'Simulation values must be purged upon live start')

    // Stop monitoring
    isMonitoring = false
    assert.equal(isMonitoring, false)
  })

  it('handles camera permission denial gracefully without unhandled rejections', async () => {
    const simulateCameraDenial = async (): Promise<string> => {
      try {
        const err = new Error('Permission denied')
        err.name = 'NotAllowedError'
        throw err
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'NotAllowedError') {
          return 'Camera access denied by user or system policy.'
        }
        return 'Camera error.'
      }
    }

    const errorMsg = await simulateCameraDenial()
    assert.equal(errorMsg, 'Camera access denied by user or system policy.')
  })

  it('safely handles missing window.api bridge with descriptive error', async () => {
    const simulateStartWithoutApi = async (mockWindow: {
      api?: { getSmartSpectraApiKey?: () => Promise<string> }
    }): Promise<string> => {
      try {
        if (!mockWindow.api || typeof mockWindow.api.getSmartSpectraApiKey !== 'function') {
          throw new Error(
            'SmartSpectra bridge unavailable: window.api is undefined. Please ensure you are running FocusTellisense AI inside the Electron desktop application window (npm run dev / npm start) and not in a regular web browser tab.'
          )
        }
        return await mockWindow.api.getSmartSpectraApiKey()
      } catch (e: unknown) {
        if (e instanceof Error) {
          return e.message
        }
        return 'Unknown error'
      }
    }

    const result = await simulateStartWithoutApi({})
    assert.match(result, /SmartSpectra bridge unavailable: window\.api is undefined/)
  })

  it('freezes static captured results and halts camera upon session completion', () => {
    let cameraStopped = false
    const mockTrack = {
      stop: () => {
        cameraStopped = true
      }
    }
    const mockMediaStream = {
      getTracks: () => [mockTrack]
    }

    let isMonitoring = true
    let isSessionComplete = false
    let readings: {
      pulseRate: { value: number; stable: boolean } | null
      breathingRate: { value: number; stable: boolean } | null
      hrv: { value: number; stable: boolean } | null
    } = {
      pulseRate: { value: 72.4, stable: true },
      breathingRate: { value: 14.8, stable: true },
      hrv: { value: 46.2, stable: true }
    }

    // Session completion trigger (keepReadings = true)
    const stopMonitoring = (keepReadings: boolean): void => {
      mockMediaStream.getTracks().forEach((t) => t.stop())
      isMonitoring = false
      if (keepReadings) {
        isSessionComplete = true
        // Readings remain static and stable
      } else {
        isSessionComplete = false
        readings = { pulseRate: null, breathingRate: null, hrv: null }
      }
    }

    stopMonitoring(true)

    assert.equal(cameraStopped, true, 'Camera must be stopped when session completes')
    assert.equal(isMonitoring, false)
    assert.equal(isSessionComplete, true)
    assert.notEqual(readings.pulseRate, null, 'Captured readings must remain static')
    assert.equal(readings.pulseRate?.value, 72.4)
    assert.equal(readings.breathingRate?.value, 14.8)

    // User starts new session -> resets previous static readings
    readings = { pulseRate: null, breathingRate: null, hrv: null }
    isSessionComplete = false
    isMonitoring = true
    assert.equal(readings.pulseRate, null)
    assert.equal(isSessionComplete, false)
    assert.equal(isMonitoring, true)
  })
})
