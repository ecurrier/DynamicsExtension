import { describe, expect, it } from 'vitest'

import { pluralName } from '@/shared/lib'

import { buildChoiceView, choiceIdentifier, localChoicesOf } from './choiceView'
import { SAMPLE_INDUSTRY, SAMPLE_TABLE } from './sample'

describe('buildChoiceView', () => {
  it('describes a global choice with the identifiers the legacy generator used', () => {
    const { choice } = buildChoiceView(SAMPLE_INDUSTRY, {})
    expect(choice.name).toBe('industrycode')
    expect(choice.identifier).toBe('Industry')
    expect(choice.identifierCamel).toBe('industry')
    expect(choice.identifierPlural).toBe(pluralName('Industry'))
    expect(choice.scope).toBe('global')
    expect(choice.tableLogicalName).toBeNull()
  })

  it('sanitises option labels both ways and flags the ends', () => {
    const { choice } = buildChoiceView(SAMPLE_INDUSTRY, {})
    expect(choice.options.map((option) => option.identifier)).toEqual([
      'Accounting',
      'AgricultureandNonpetrolNaturalResourceExtraction',
      'BroadcastingPrintingandPublishing',
    ])
    expect(choice.options[1]?.identifierUnderscored).toBe('Agriculture_and_Nonpetrol_Natural_Resource_Extraction')
    expect(choice.options.map((option) => option.value)).toEqual([1, 2, 3])
    expect(choice.options.map((option) => option.isFirst)).toEqual([true, false, false])
    expect(choice.options.map((option) => option.isLast)).toEqual([false, false, true])
  })

  it('keeps the member names the legacy generator produced', () => {
    const { choice } = buildChoiceView(SAMPLE_INDUSTRY, {})
    expect(choice.options.map((option) => option.identifierUnderscored)).toEqual([
      'Accounting',
      'Agriculture_and_Nonpetrol_Natural_Resource_Extraction',
      'Broadcasting_Printing_and_Publishing',
    ])
  })

  it('passes the settings through', () => {
    expect(buildChoiceView(SAMPLE_INDUSTRY, { namespace: 'Contoso' }).settings).toEqual({ namespace: 'Contoso' })
  })
})

describe('localChoicesOf', () => {
  it('lists the table-owned option sets under their column display name', () => {
    const choices = localChoicesOf(SAMPLE_TABLE)
    expect(choices.map((choice) => choice.name)).toEqual([
      'new_account_new_status',
      'new_account_new_tags',
      'account_donotemail',
    ])
    expect(choices[0]).toMatchObject({
      displayName: 'Onboarding Status',
      isGlobal: false,
      tableLogicalName: 'account',
      columnLogicalName: 'new_status',
    })
    expect(choices[0]?.options).toHaveLength(3)
  })

  it('leaves global option sets to the global list', () => {
    expect(localChoicesOf(SAMPLE_TABLE).some((choice) => choice.name === 'industrycode')).toBe(false)
  })
})

describe('choiceIdentifier', () => {
  it('matches the identifier the table view assigns to the same choice', () => {
    expect(choiceIdentifier('Onboarding Status')).toBe('OnboardingStatus')
    expect(choiceIdentifier('Do not allow Emails')).toBe('DonotallowEmails')
  })
})
