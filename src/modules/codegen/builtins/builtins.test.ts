import { describe, expect, it } from 'vitest'

import { TEMPLATE_KINDS, TEMPLATE_LANGUAGES } from '@/shared/types'

import { generate, localChoicesOf, SAMPLE_INDUSTRY, SAMPLE_TABLE, settingDefaults } from '../lib'
import {
  BUILTIN_TEMPLATES,
  CSHARP_CHOICE_TEMPLATE,
  CSHARP_TABLE_TEMPLATE,
  JAVASCRIPT_CHOICE_TEMPLATE,
  TYPESCRIPT_TABLE_TEMPLATE,
} from './index'

const localStatus = localChoicesOf(SAMPLE_TABLE)[0]
if (!localStatus) {
  throw new Error('The sample table has no local choice')
}

const LEGACY_CSHARP = new Map([
  [
    SAMPLE_INDUSTRY,
    [
      'public enum Industry',
      '{',
      '\tAccounting = 1,',
      '\tAgriculture_and_Nonpetrol_Natural_Resource_Extraction = 2,',
      '\tBroadcasting_Printing_and_Publishing = 3,',
      '}',
    ].join('\n'),
  ],
  [
    localStatus,
    [
      'public enum OnboardingStatus',
      '{',
      '\tNew = 100000000,',
      '\tIn_Progress = 100000001,',
      '\tDone = 100000002,',
      '}',
    ].join('\n'),
  ],
])

const LEGACY_JAVASCRIPT = new Map([
  [
    SAMPLE_INDUSTRY,
    [
      'const Industries = {',
      '\tAccounting: 1,',
      '\tAgricultureandNonpetrolNaturalResourceExtraction: 2,',
      '\tBroadcastingPrintingandPublishing: 3,',
      '};',
    ].join('\n'),
  ],
  [
    localStatus,
    ['const OnboardingStatuses = {', '\tNew: 100000000,', '\tInProgress: 100000001,', '\tDone: 100000002,', '};'].join(
      '\n',
    ),
  ],
])

describe('built-in templates', () => {
  it('are well formed and unique', () => {
    const ids = BUILTIN_TEMPLATES.map((template) => template.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const template of BUILTIN_TEMPLATES) {
      expect(template.builtIn).toBe(true)
      expect(TEMPLATE_KINDS).toContain(template.kind)
      expect(TEMPLATE_LANGUAGES.map((language) => language.value)).toContain(template.language)
      expect(template.filenamePattern).not.toBe('')
    }
  })

  it('reproduce the legacy C# enum exactly', () => {
    for (const choice of [SAMPLE_INDUSTRY, localStatus]) {
      const result = generate(
        CSHARP_CHOICE_TEMPLATE,
        { kind: 'choice', choice },
        { settings: {}, includeSystemColumns: false },
      )
      expect(result.error).toBeNull()
      expect(result.unresolved).toEqual([])
      expect(result.output).toBe(LEGACY_CSHARP.get(choice))
    }
  })

  it('reproduce the legacy JavaScript object exactly', () => {
    for (const choice of [SAMPLE_INDUSTRY, localStatus]) {
      const result = generate(
        JAVASCRIPT_CHOICE_TEMPLATE,
        { kind: 'choice', choice },
        { settings: {}, includeSystemColumns: false },
      )
      expect(result.error).toBeNull()
      expect(result.output).toBe(LEGACY_JAVASCRIPT.get(choice))
    }
  })

  it('render a C# class for the sample table without unresolved paths', () => {
    const result = generate(
      CSHARP_TABLE_TEMPLATE,
      { kind: 'table', table: SAMPLE_TABLE },
      {
        settings: { ...settingDefaults(CSHARP_TABLE_TEMPLATE), namespace: 'Contoso.Models', prefix: 'new' },
        includeSystemColumns: false,
      },
    )
    expect(result.error).toBeNull()
    expect(result.unresolved).toEqual([])
    expect(result.fileName).toBe('Account.cs')
    expect(result.output).toContain('namespace Contoso.Models;')
    expect(result.output).toContain('public partial class Account : Entity')
    expect(result.output).toContain('public const string CreditLimit = "new_creditlimit";')
    expect(result.output).toContain('public DateOnly? RenewalDate')
    expect(result.output).toContain('DateOnly.FromDateTime(value)')
    expect(result.output).toContain('public EntityReference OwnerId')
    expect(result.output).toContain('public OptionSetValueCollection Tags')
    expect(result.output).toContain('Id = value ?? Guid.Empty;')
    expect(result.output).not.toContain('VersionNumber')
    expect(result.output.trimEnd().endsWith('}')).toBe(true)
  })

  it('leave the namespace out when the setting is empty', () => {
    const result = generate(
      CSHARP_TABLE_TEMPLATE,
      { kind: 'table', table: SAMPLE_TABLE },
      { settings: settingDefaults(CSHARP_TABLE_TEMPLATE), includeSystemColumns: false },
    )
    expect(result.output).not.toContain('namespace')
    expect(result.output).toContain('public const string NewCreditLimit = "new_creditlimit";')
  })

  it('render a TypeScript interface for the sample table', () => {
    const result = generate(
      TYPESCRIPT_TABLE_TEMPLATE,
      { kind: 'table', table: SAMPLE_TABLE },
      { settings: { prefix: 'new' }, includeSystemColumns: false },
    )
    expect(result.error).toBeNull()
    expect(result.unresolved).toEqual([])
    expect(result.fileName).toBe('account.ts')
    expect(result.output).toContain('export interface Account {')
    expect(result.output).toContain('  new_tags?: number[] | null')
    expect(result.output).toContain("  creditLimit: 'new_creditlimit',")
    expect(result.output).toContain("  entitySetName: 'accounts',")
  })

  it('refuse to render a source of the wrong kind', () => {
    const result = generate(
      CSHARP_CHOICE_TEMPLATE,
      { kind: 'table', table: SAMPLE_TABLE },
      { settings: {}, includeSystemColumns: false },
    )
    expect(result.error).toContain('choice template')
    expect(result.output).toBe('')
  })
})

describe('C# table template base class', () => {
  it('drops the base class and constructor when the setting is empty', () => {
    const result = generate(
      CSHARP_TABLE_TEMPLATE,
      { kind: 'table', table: SAMPLE_TABLE },
      { settings: { ...settingDefaults(CSHARP_TABLE_TEMPLATE), baseClass: '' }, includeSystemColumns: false },
    )
    expect(result.error).toBeNull()
    expect(result.output).toMatch(/^public partial class Account$/m)
    expect(result.output).not.toContain(': base(EntityLogicalName)')
    expect(result.output).toContain('public static class Fields')
  })
})
