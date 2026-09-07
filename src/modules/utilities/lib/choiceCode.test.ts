import { describe, expect, it } from 'vitest'

import { generateChoiceCode, sanitizeIdentifier } from './choiceCode'

const choice = {
  name: 'Account Type',
  scope: 'account',
  options: [
    { value: 1, label: 'Customer' },
    { value: 2, label: 'Partner (Gold)' },
    { value: 3, label: 'Non-Profit Org.' },
  ],
}

describe('generateChoiceCode', () => {
  it('produces a C# enum', () => {
    expect(generateChoiceCode(choice, 'csharp')).toBe(
      ['public enum AccountType', '{', '\tCustomer = 1,', '\tPartner_Gold = 2,', '\tNonProfit_Org = 3,', '}'].join(
        '\n',
      ),
    )
  })

  it('produces a JavaScript object literal', () => {
    expect(generateChoiceCode(choice, 'javascript')).toBe(
      ['const AccountTypes = {', '\tCustomer: 1,', '\tPartnerGold: 2,', '\tNonProfitOrg: 3,', '};'].join('\n'),
    )
  })

  it('strips special characters', () => {
    expect(sanitizeIdentifier(" Yes/No: it's (fine) ", '_')).toBe('YesNo_its_fine')
  })
})
