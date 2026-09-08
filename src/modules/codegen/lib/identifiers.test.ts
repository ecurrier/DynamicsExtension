import { describe, expect, it } from 'vitest'

import { camelCase, identifierFor, pascalCase, sanitizeIdentifier, stripPrefix } from './identifiers'

describe('stripPrefix', () => {
  it('removes a matching publisher prefix regardless of case or trailing underscore', () => {
    expect(stripPrefix('new_CustomField', 'new')).toBe('CustomField')
    expect(stripPrefix('new_CustomField', 'NEW_')).toBe('CustomField')
    expect(stripPrefix('cr1a2_Score', ' cr1a2 ')).toBe('Score')
  })

  it('accepts several prefixes separated by commas or spaces', () => {
    expect(stripPrefix('chfs_Field', 'eyfrcc,chfs')).toBe('Field')
    expect(stripPrefix('eyfrcc_Field', 'eyfrcc, chfs')).toBe('Field')
    expect(stripPrefix('other_Field', 'eyfrcc chfs')).toBe('other_Field')
    expect(identifierFor('chfs_CustomField', 'eyfrcc,chfs')).toBe('CustomField')
  })

  it('leaves names that do not carry the prefix alone', () => {
    expect(stripPrefix('AccountId', 'new')).toBe('AccountId')
    expect(stripPrefix('newer_Field', 'new')).toBe('newer_Field')
    expect(stripPrefix('new_CustomField', '')).toBe('new_CustomField')
  })
})

describe('pascalCase', () => {
  it('capitalises underscore separated parts and keeps existing casing', () => {
    expect(pascalCase('new_CustomField')).toBe('NewCustomField')
    expect(pascalCase('custom_field')).toBe('CustomField')
    expect(pascalCase('AccountId')).toBe('AccountId')
  })

  it('drops characters that cannot appear in an identifier', () => {
    expect(pascalCase('Account Name!')).toBe('AccountName')
    expect(pascalCase('e-mail address')).toBe('EMailAddress')
  })

  it('guards identifiers that would start with a digit', () => {
    expect(pascalCase('1st_place')).toBe('_1stPlace')
  })
})

describe('camelCase', () => {
  it('lowers the first letter', () => {
    expect(camelCase('AccountId')).toBe('accountId')
    expect(camelCase('new_CustomField')).toBe('newCustomField')
  })

  it('lowers a leading acronym as a whole', () => {
    expect(camelCase('URLPath')).toBe('urlPath')
    expect(camelCase('URL')).toBe('url')
    expect(camelCase('ID')).toBe('id')
  })
})

describe('identifierFor', () => {
  it('strips the prefix before casing', () => {
    expect(identifierFor('new_CustomField', 'new')).toBe('CustomField')
    expect(identifierFor('new_customfield', 'new')).toBe('Customfield')
    expect(identifierFor('new_CustomField', '')).toBe('NewCustomField')
  })
})

describe('sanitizeIdentifier', () => {
  it('drops punctuation and replaces whitespace the way the legacy generators did', () => {
    expect(sanitizeIdentifier('  In Progress (Phase-2) ', '_')).toBe('In_Progress_Phase2')
    expect(sanitizeIdentifier('A\x5cB#C.D', '')).toBe('ABCD')
    expect(sanitizeIdentifier('Do not allow Emails', '')).toBe('DonotallowEmails')
  })
})
