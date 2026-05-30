import { describe, it, expect } from 'vitest'
import { unlimitedScope, formatCalls, formatSmsScoped, formatData } from '../utils'

// Minimal fake translator so the formatters return readable labels in tests.
const t = ((k: string) => (({
  'offer.unlimitedAllNet': 'Unlimited (all networks)',
  'offer.unlimitedOnNet': 'Unlimited ({op})',
  'common.unlimited': 'Unlimited',
  'common.none': 'None',
  'common.min': 'min',
} as Record<string, string>)[k] ?? k)) as any

describe('unlimitedScope', () => {
  it('detects on-net from "vers Djezzy"', () => {
    expect(unlimitedScope(['ILLIMITÉ VERS DJEZZY'], 'calls')).toBe('onnet')
  })
  it('detects all-networks', () => {
    expect(unlimitedScope(['Unlimited calls (all networks)'], 'calls')).toBe('all')
  })
  it('reads SMS scope independently of calls', () => {
    expect(unlimitedScope(['Unlimited calls (all networks)', 'Unlimited Mobilis SMS'], 'sms')).toBe('onnet')
  })
  it('returns null when the features do not state a scope', () => {
    expect(unlimitedScope(['300 DA credit'], 'calls')).toBe(null)
  })
})

describe('formatCalls / formatSmsScoped', () => {
  it('shows the operator for on-net unlimited calls', () => {
    const o = { voiceMinutes: -1, smsCount: -1, features: '["Unlimited Djezzy calls"]', operator: { name: 'Djezzy' } }
    expect(formatCalls(o, t)).toBe('Unlimited (Djezzy)')
  })
  it('shows all-networks for cross-network unlimited calls', () => {
    const o = { voiceMinutes: -1, smsCount: 0, features: '["Unlimited calls (all networks)"]', operator: { name: 'Mobilis' } }
    expect(formatCalls(o, t)).toBe('Unlimited (all networks)')
  })
  it('falls back to None when not unlimited', () => {
    const o = { voiceMinutes: 0, smsCount: 0, features: '[]', operator: { name: 'X' } }
    expect(formatCalls(o, t)).toBe('None')
    expect(formatSmsScoped(o, t)).toBe('None')
  })
})

describe('formatData', () => {
  it('renders sub-1GB as MB, not fractional GB', () => {
    expect(formatData(0.293)).toBe('293 MB')
  })
  it('renders whole GB plainly', () => {
    expect(formatData(5)).toBe('5 GB')
  })
  it('treats 0 as unlimited', () => {
    expect(formatData(0, t)).toBe('Unlimited')
  })
})
