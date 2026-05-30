import { describe, it, expect } from 'vitest'
import { parseSearchTokens } from '../search-tokens'

// The structured search parser is core logic shared (in spirit) with the server-side
// /api/offers handler. These tests pin its token vocabulary so the two stay aligned.
describe('parseSearchTokens', () => {
  const kinds = (q: string) => parseSearchTokens(q).map(t => t.kind)

  it('parses data volumes in GB / Go / giga', () => {
    expect(parseSearchTokens('5 go')).toContainEqual({ kind: 'data', value: 5 })
    expect(parseSearchTokens('10gb')).toContainEqual({ kind: 'data', value: 10 })
    expect(parseSearchTokens('2 giga')).toContainEqual({ kind: 'data', value: 2 })
  })

  it('parses a price token', () => {
    expect(parseSearchTokens('1000 da')).toContainEqual({ kind: 'price', value: 1000 })
    expect(parseSearchTokens('500 dinars')).toContainEqual({ kind: 'price', value: 500 })
  })

  it('parses network generations', () => {
    expect(parseSearchTokens('5g')).toContainEqual({ kind: 'network', value: '5G' })
    expect(parseSearchTokens('4g')).toContainEqual({ kind: 'network', value: '4G' })
  })

  it('parses operators', () => {
    expect(parseSearchTokens('djezzy')).toContainEqual({ kind: 'operator', value: 'djezzy' })
    expect(parseSearchTokens('ooredoo')).toContainEqual({ kind: 'operator', value: 'ooredoo' })
  })

  it('parses the unlimited keyword in French and English', () => {
    expect(kinds('illimité')).toContain('unlimited')
    expect(kinds('unlimited')).toContain('unlimited')
    expect(kinds('infini')).toContain('unlimited')
  })

  it('parses plan type', () => {
    expect(parseSearchTokens('prépayé')).toContainEqual({ kind: 'type', value: 'PREPAID' })
    expect(parseSearchTokens('postpaid')).toContainEqual({ kind: 'type', value: 'POSTPAID' })
  })

  it('does NOT produce numeric calls/SMS tokens (removed by design)', () => {
    // The catalogue stores calls/SMS as binary, so "10 sms" must not become a
    // structured numeric token — only free text remains.
    const t = parseSearchTokens('10 sms')
    expect(t.every(x => x.kind === 'text')).toBe(true)
  })

  it('combines structured tokens and keeps free-text remainder', () => {
    const t = parseSearchTokens('5 go djezzy internet')
    expect(t).toContainEqual({ kind: 'data', value: 5 })
    expect(t).toContainEqual({ kind: 'operator', value: 'djezzy' })
    expect(t).toContainEqual({ kind: 'text', value: 'internet' })
  })

  it('returns nothing for an empty query', () => {
    expect(parseSearchTokens('')).toEqual([])
  })
})
