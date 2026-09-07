import { describe, expect, it } from 'vitest'

import { buildPublishXml, formTypeFilter, formTypeLabel } from './systemForms'

describe('systemForms', () => {
  it('labels known form types and falls back for unknown ones', () => {
    expect(formTypeLabel(2)).toBe('Main')
    expect(formTypeLabel(7)).toBe('Quick Create')
    expect(formTypeLabel(12)).toBe('Main Interactive')
    expect(formTypeLabel(99)).toBe('Type 99')
  })

  it('builds the type filter and publish request', () => {
    expect(formTypeFilter()).toBe('type eq 2 or type eq 5 or type eq 6 or type eq 7 or type eq 11 or type eq 12')
    expect(buildPublishXml('account')).toBe(
      '<importexportxml><entities><entity>account</entity></entities></importexportxml>',
    )
  })
})
