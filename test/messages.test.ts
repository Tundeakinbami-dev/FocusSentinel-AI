import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Metrics, decodeMetrics } from '../node_modules/@smartspectra/node-sdk/js/messages/index.js'

describe('SmartSpectra Protobuf Decoding', () => {
  it('correctly encodes and decodes empty metrics packet', () => {
    const emptyPayload = Metrics.create({
      breathing: { rate: [] },
      cardio: { pulseRate: [], hrv: [] }
    })
    const encoded = Metrics.encode(emptyPayload).finish()
    const decoded = decodeMetrics(encoded)

    assert.ok(decoded, 'Decoded message should be defined')
    assert.ok(decoded.breathing, 'Breathing branch should exist')
    assert.ok(decoded.cardio, 'Cardio branch should exist')
    assert.equal(decoded.breathing.rate?.length, 0)
  })

  it('correctly decodes cardio and breathing measurements with confidence and stability', () => {
    const payload = Metrics.create({
      breathing: {
        rate: [
          { value: 14.2, confidence: 85, stable: true, timestamp: 1700000000000 }
        ]
      },
      cardio: {
        pulseRate: [
          { value: 72.5, confidence: 92, stable: true, timestamp: 1700000000000 }
        ],
        hrv: [
          { rmssd: 42.0, confidence: 88, stable: true, timestamp: 1700000000000 }
        ]
      }
    })
    const encoded = Metrics.encode(payload).finish()
    const decoded = decodeMetrics(encoded)

    assert.ok(Math.abs((decoded.breathing?.rate?.[0]?.value ?? 0) - 14.2) < 0.01)
    assert.equal(decoded.breathing?.rate?.[0]?.confidence, 85)
    assert.equal(decoded.breathing?.rate?.[0]?.stable, true)

    assert.ok(Math.abs((decoded.cardio?.pulseRate?.[0]?.value ?? 0) - 72.5) < 0.01)
    assert.equal(decoded.cardio?.pulseRate?.[0]?.confidence, 92)
    assert.equal(decoded.cardio?.pulseRate?.[0]?.stable, true)

    assert.ok(Math.abs((decoded.cardio?.hrv?.[0]?.rmssd ?? 0) - 42.0) < 0.01)
    assert.equal(decoded.cardio?.hrv?.[0]?.confidence, 88)
    assert.equal(decoded.cardio?.hrv?.[0]?.stable, true)
  })

  it('rejects malformed or invalid buffer with error', () => {
    const corruptBuffer = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x00, 0x01])
    assert.throws(
      () => {
        decodeMetrics(corruptBuffer)
      },
      /Error|illegal syntax/i
    )
  })
})
