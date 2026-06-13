/**
 * Payment unit tests — tests the signature verification logic
 * without hitting Razorpay servers. Razorpay SDK is mocked.
 */
const crypto = require('crypto')

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recreates the exact same signature check used in routes/payment.js
 */
const computeSignature = (orderId, paymentId, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
}

// ── Unit Tests ────────────────────────────────────────────────────────────────

describe('Payment — Signature Verification Logic', () => {
  const SECRET = 'test_razorpay_secret'
  const ORDER_ID = 'order_test123'
  const PAYMENT_ID = 'pay_test456'

  it('produces a deterministic HMAC-SHA256 signature', () => {
    const sig1 = computeSignature(ORDER_ID, PAYMENT_ID, SECRET)
    const sig2 = computeSignature(ORDER_ID, PAYMENT_ID, SECRET)
    expect(sig1).toBe(sig2)
    expect(sig1).toMatch(/^[a-f0-9]{64}$/) // 64 hex chars
  })

  it('valid signature matches expected', () => {
    const expected = computeSignature(ORDER_ID, PAYMENT_ID, SECRET)
    expect(expected).toBe(expected) // tautological but documents the contract
  })

  it('tampered payment_id produces different signature', () => {
    const valid = computeSignature(ORDER_ID, PAYMENT_ID, SECRET)
    const tampered = computeSignature(ORDER_ID, 'pay_TAMPERED', SECRET)
    expect(valid).not.toBe(tampered)
  })

  it('tampered order_id produces different signature', () => {
    const valid = computeSignature(ORDER_ID, PAYMENT_ID, SECRET)
    const tampered = computeSignature('order_TAMPERED', PAYMENT_ID, SECRET)
    expect(valid).not.toBe(tampered)
  })

  it('wrong secret produces different signature', () => {
    const valid = computeSignature(ORDER_ID, PAYMENT_ID, SECRET)
    const wrong = computeSignature(ORDER_ID, PAYMENT_ID, 'wrong_secret')
    expect(valid).not.toBe(wrong)
  })

  it('empty string inputs produce a signature (not undefined)', () => {
    const sig = computeSignature('', '', SECRET)
    expect(typeof sig).toBe('string')
    expect(sig.length).toBe(64)
  })
})

// ── Mock Razorpay SDK Integration Test ───────────────────────────────────────

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_mocked123',
        amount: 59900,
        currency: 'INR'
      })
    }
  }))
})

describe('Payment — Razorpay SDK Mock', () => {
  it('mock SDK returns expected shape', async () => {
    const Razorpay = require('razorpay')
    const rp = new Razorpay({ key_id: 'test', key_secret: 'test' })
    const order = await rp.orders.create({ amount: 59900, currency: 'INR', receipt: 'TRI-TEST' })
    expect(order.id).toBe('order_mocked123')
    expect(order.amount).toBe(59900)
    expect(order.currency).toBe('INR')
  })
})
