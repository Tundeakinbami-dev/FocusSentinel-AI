import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Mirrors normalized baseline waveform calculation in SignalMonitor.tsx
function computeNormalizedPoints(
  history: number[],
  type: 'breathing' | 'pulse' | 'hrv'
): { x: number; y: number }[] {
  if (history.length === 0) return []

  const min = Math.min(...history)
  const max = Math.max(...history)
  const minRange = type === 'pulse' ? 10 : type === 'breathing' ? 4 : 15
  const range = Math.max(max - min, minRange)
  const midpoint = (max + min) / 2
  const baselineMin = midpoint - range / 2

  return history.map((value, index) => {
    const x = history.length === 1 ? 150 : (index / (history.length - 1)) * 300
    const y = 55 - ((value - baselineMin) / range) * 45
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
  })
}

// Mirrors simulation generator logic in MonitoringContext.tsx
function generateSimulatedVitals(): { breathingRate: number; pulseRate: number; hrv: number } {
  const breathingRate = Number((12 + Math.random() * 6).toFixed(1))
  const pulseRate = Number((65 + Math.random() * 20).toFixed(1))
  const hrv = Number((25 + Math.random() * 35).toFixed(1))
  return { breathingRate, pulseRate, hrv }
}

describe('Signal Math & Waveform Normalization', () => {
  it('prevents micro-jitter from scaling to full chart height', () => {
    // 0.2 bpm jitter around 72 bpm
    const stablePulseHistory = [72.0, 72.1, 72.0, 72.2, 72.1]
    const points = computeNormalizedPoints(stablePulseHistory, 'pulse')

    assert.equal(points.length, 5)
    // The vertical displacement (delta Y) should be small (damped by minRange of 10)
    const yValues = points.map((p) => p.y)
    const deltaY = Math.max(...yValues) - Math.min(...yValues)

    // With a range of 10 and 0.2 bpm change, delta Y is (0.2 / 10) * 45 = ~0.9 px, NOT 45 px!
    assert.ok(deltaY < 5.0, `Delta Y was ${deltaY}, expected < 5.0 px`)
  })

  it('accurately captures significant physiological shifts', () => {
    // A real 20 bpm elevation in heart rate
    const elevatedPulseHistory = [65.0, 70.0, 75.0, 80.0, 85.0]
    const points = computeNormalizedPoints(elevatedPulseHistory, 'pulse')

    const yValues = points.map((p) => p.y)
    const deltaY = Math.max(...yValues) - Math.min(...yValues)

    // Real elevation should traverse most of the vertical canvas height (~45 px)
    assert.ok(deltaY > 35.0, `Delta Y was ${deltaY}, expected > 35.0 px`)
  })

  it('generates simulated vitals strictly within standard physiological boundaries', () => {
    for (let i = 0; i < 100; i++) {
      const { breathingRate, pulseRate, hrv } = generateSimulatedVitals()

      assert.ok(
        breathingRate >= 12.0 && breathingRate <= 18.0,
        `Breathing rate ${breathingRate} out of range [12, 18]`
      )
      assert.ok(
        pulseRate >= 65.0 && pulseRate <= 85.0,
        `Pulse rate ${pulseRate} out of range [65, 85]`
      )
      assert.ok(
        hrv >= 25.0 && hrv <= 60.0,
        `HRV ${hrv} out of range [25, 60]`
      )
    }
  })
})
