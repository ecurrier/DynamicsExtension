import { describe, expect, it } from 'vitest'

import { type AdminModeResult, type CapturedControlState } from '@/shared/types'

import { adminModeFindings, adminModeToText } from './adminMode'

const control = (overrides: Partial<CapturedControlState>): CapturedControlState => ({
  name: 'name',
  label: 'Name',
  visible: true,
  disabled: false,
  requiredLevel: 'none',
  ...overrides,
})

const result = (controls: CapturedControlState[]): AdminModeResult => ({
  total: controls.length,
  hidden: controls.filter((entry) => !entry.visible),
  disabled: controls.filter((entry) => entry.disabled),
  required: controls.filter((entry) => entry.requiredLevel === 'required'),
  snapshot: { entityLogicalName: 'account', formId: null, controls },
})

describe('adminModeFindings', () => {
  it('reports only controls that were restricted', () => {
    const findings = adminModeFindings(
      result([
        control({ name: 'ok' }),
        control({ name: 'hidden', label: 'Hidden', visible: false }),
        control({ name: 'locked', label: 'Locked', disabled: true }),
      ]),
    )
    expect(findings.map((finding) => finding.name)).toEqual(['hidden', 'locked'])
  })

  it('flags hidden-and-required first, since that is the save-blocking combination', () => {
    const findings = adminModeFindings(
      result([
        control({ name: 'a', label: 'A', disabled: true }),
        control({ name: 'b', label: 'B', visible: false, requiredLevel: 'required' }),
      ]),
    )
    expect(findings[0]).toMatchObject({ name: 'b', state: 'Hidden · Required', severe: true })
    expect(findings[1]).toMatchObject({ name: 'a', severe: false })
  })

  it('says so plainly when nothing was restricted', () => {
    expect(adminModeToText(result([control({})]))).toContain('No controls on this form')
  })
})
