import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Mirrors security protocol check in src/main/index.ts
function isSafeExternalUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// Mirrors isAuthorizedOrigin check in src/main/index.ts
function isAuthorizedOrigin(requestingUrl: string, configuredDevUrl?: string): boolean {
  try {
    if (configuredDevUrl) {
      return new URL(requestingUrl).origin === new URL(configuredDevUrl).origin
    }
    return requestingUrl.startsWith('file://')
  } catch {
    return false
  }
}

describe('Security Protocol & Origin Validation', () => {
  it('allows safe https and http protocols', () => {
    assert.equal(isSafeExternalUrl('https://presagetech.com'), true)
    assert.equal(isSafeExternalUrl('http://localhost:5173'), true)
    assert.equal(isSafeExternalUrl('https://example.com/docs'), true)
  })

  it('strictly blocks dangerous and local protocol schemes', () => {
    assert.equal(isSafeExternalUrl('javascript:alert(1)'), false)
    assert.equal(isSafeExternalUrl('data:text/html,<h1>PWNED</h1>'), false)
    assert.equal(isSafeExternalUrl('file:///etc/passwd'), false)
    assert.equal(isSafeExternalUrl('smb://malicious-host/share'), false)
    assert.equal(isSafeExternalUrl('powershell://command'), false)
    assert.equal(isSafeExternalUrl('not-a-url'), false)
  })

  it('restricts internal navigation strictly to authorized origins', () => {
    assert.equal(isAuthorizedOrigin('file:///app/out/renderer/index.html'), true)
    assert.equal(isAuthorizedOrigin('file:///index.html'), true)
    assert.equal(isAuthorizedOrigin('https://evil.com'), false)
    assert.equal(isAuthorizedOrigin('http://localhost:8080'), false)

    // With configured dev URL
    const devUrl = 'http://localhost:5173'
    assert.equal(isAuthorizedOrigin('http://localhost:5173/page', devUrl), true)
    assert.equal(isAuthorizedOrigin('http://localhost:3000', devUrl), false)
  })
})
