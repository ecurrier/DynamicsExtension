import { describe, expect, it } from 'vitest'

import { buildTokenOriginRule, TOKEN_ORIGIN_RULE_ID } from './tokenOriginRule'

describe('token origin rule', () => {
  it("removes the Origin header only on the extension's own token posts to the Microsoft login hosts", () => {
    expect(buildTokenOriginRule('abcdefghijklmnop')).toEqual({
      id: TOKEN_ORIGIN_RULE_ID,
      priority: 1,
      action: { type: 'modifyHeaders', requestHeaders: [{ header: 'Origin', operation: 'remove' }] },
      condition: {
        initiatorDomains: ['abcdefghijklmnop'],
        requestDomains: ['login.microsoftonline.com', 'login.microsoftonline.us'],
        urlFilter: '/oauth2/v2.0/token',
        requestMethods: ['post'],
        resourceTypes: ['xmlhttprequest'],
      },
    })
  })

  it('uses an id far above any tab-scoped impersonation rule', () => {
    expect(TOKEN_ORIGIN_RULE_ID).toBeGreaterThan(1_000_000_000)
  })
})
