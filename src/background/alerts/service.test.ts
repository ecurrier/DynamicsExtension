import { describe, expect, it } from 'vitest'

import { shouldApplyOnUpdate } from './service'

describe('shouldApplyOnUpdate', () => {
  it('only reacts to completed loads of https pages', () => {
    expect(shouldApplyOnUpdate({ status: 'complete' }, 'https://org.crm.dynamics.com/main.aspx')).toBe(true)
    expect(shouldApplyOnUpdate({ status: 'loading' }, 'https://org.crm.dynamics.com/')).toBe(false)
    expect(shouldApplyOnUpdate({ status: 'complete' }, 'chrome://extensions')).toBe(false)
    expect(shouldApplyOnUpdate({ status: 'complete' }, undefined)).toBe(false)
    expect(shouldApplyOnUpdate({}, 'https://org.crm.dynamics.com/')).toBe(false)
  })
})
