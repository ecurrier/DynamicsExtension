import { describe, expect, it } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

import { environmentsItem, lastVisitedAreaItem, schemaVersionItem, settingsItem, templatesItem } from './items'
import { LEGACY_TARGET_TO_AREA } from './legacyKeys'
import { buildSchemaFromLegacy, migrateLegacyStorage } from './migrateLegacy'
import { DEFAULT_SETTINGS, LEGACY_SCHEMA_VERSION } from './schema'

const legacyFixture = {
  'Settings.environments.11111111-1111-4111-8111-111111111111': {
    environmentName: 'Dev',
    environmentType: 'GCC',
    modelDrivenAppUrl: 'https://dev.crm9.dynamics.com/',
    powerPagesUrl: 'https://dev.powerappsportals.us/',
    environmentId: '22222222-2222-4222-8222-222222222222',
  },
  'Settings.environments.33333333-3333-4333-8333-333333333333': {
    environmentName: 'Broken',
    environmentType: 'Mars',
    modelDrivenAppUrl: 'https://broken.crm.dynamics.com/',
  },
  'Settings.extension': {
    Extension: { OpenLastVisitedPage: { Enabled: true } },
    Utilities: { OpenMakerUrl: { DefaultEnvironment: true }, OpenControlEditor: { UseDefaultSolution: false } },
    Security: { ApplyChanges: { RequireConfirmation: false } },
  },
  'Extension.OpenLastVisitedPage.Target': '#webapi-retrieve-records-content',
  'Templates.model-driven-app.44444444-4444-4444-8444-444444444444': {
    templateName: 'Contact defaults',
    fields: { firstname: 'Test', donotemail: true },
  },
  'Templates.portal.55555555-5555-4555-8555-555555555555': {
    templateName: 'Portal defaults',
    fields: { adx_name: 'Portal' },
  },
  'Templates.unknown.66666666-6666-4666-8666-666666666666': { templateName: 'Ignored', fields: {} },
  unrelated: 'keep me',
}

describe('buildSchemaFromLegacy', () => {
  it('maps environments, templates, settings, and last visited page', () => {
    const migrated = buildSchemaFromLegacy(legacyFixture)

    expect(migrated.environments['11111111-1111-4111-8111-111111111111']).toEqual({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Dev',
      environmentType: 'GCC',
      modelDrivenAppUrl: 'https://dev.crm9.dynamics.com/',
      powerPagesUrl: 'https://dev.powerappsportals.us/',
      environmentId: '22222222-2222-4222-8222-222222222222',
      notes: '',
      servicePrincipalId: null,
      alert: null,
    })
    expect(migrated.environments['33333333-3333-4333-8333-333333333333']).toMatchObject({
      environmentType: 'Commercial',
      powerPagesUrl: '',
      environmentId: '',
    })
    expect(migrated.settings).toEqual({
      ...DEFAULT_SETTINGS,
      openLastVisitedArea: true,
      makerPortalUseCurrentEnvironment: true,
      adminCenterUseCurrentEnvironment: DEFAULT_SETTINGS.adminCenterUseCurrentEnvironment,
      controlEditorUseDefaultSolution: false,
      securityRequireRemovalConfirmation: false,
    })
    expect(migrated.lastVisitedArea).toBe('webapi.retrieve-records')
    expect(migrated.templates['model-driven-app']['44444444-4444-4444-8444-444444444444']).toEqual({
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Contact defaults',
      fields: { firstname: 'Test', donotemail: true },
    })
    expect(migrated.templates.portal['55555555-5555-4555-8555-555555555555']?.name).toBe('Portal defaults')
    expect(migrated.legacyKeys).not.toContain('unrelated')
    expect(migrated.legacyKeys).toHaveLength(7)
  })

  it('returns defaults when nothing legacy exists', () => {
    const migrated = buildSchemaFromLegacy({ unrelated: 1 })
    expect(migrated.environments).toEqual({})
    expect(migrated.settings).toEqual(DEFAULT_SETTINGS)
    expect(migrated.lastVisitedArea).toBeNull()
    expect(migrated.legacyKeys).toEqual([])
  })

  it('maps every legacy pane id to an area', () => {
    expect(Object.keys(LEGACY_TARGET_TO_AREA)).toHaveLength(8)
    expect(new Set(Object.values(LEGACY_TARGET_TO_AREA)).size).toBe(8)
  })
})

describe('migrateLegacyStorage', () => {
  it('writes the new schema, stamps the version, and removes legacy keys', async () => {
    await fakeBrowser.storage.local.set(legacyFixture)

    expect(await migrateLegacyStorage()).toBe(true)

    expect(await schemaVersionItem.getValue()).toBe(LEGACY_SCHEMA_VERSION)
    expect(Object.keys(await environmentsItem.getValue())).toHaveLength(2)
    expect((await settingsItem.getValue()).openLastVisitedArea).toBe(true)
    expect(await lastVisitedAreaItem.getValue()).toBe('webapi.retrieve-records')
    expect(Object.keys((await templatesItem.getValue())['model-driven-app'])).toHaveLength(1)
    const remaining = await fakeBrowser.storage.local.get(null)
    expect(
      Object.keys(remaining).filter(
        (key) => key.startsWith('Settings.') || key.startsWith('Templates.') || key.startsWith('Extension.'),
      ),
    ).toEqual([])
    expect(remaining.unrelated).toBe('keep me')
  })

  it('is a no-op once the schema version is current', async () => {
    await schemaVersionItem.setValue(LEGACY_SCHEMA_VERSION)
    await fakeBrowser.storage.local.set({
      'Settings.extension': { Extension: { OpenLastVisitedPage: { Enabled: true } } },
    })

    expect(await migrateLegacyStorage()).toBe(false)
    expect((await settingsItem.getValue()).openLastVisitedArea).toBe(false)
  })

  it('stamps the version on a fresh install without legacy keys', async () => {
    expect(await migrateLegacyStorage()).toBe(false)
    expect(await schemaVersionItem.getValue()).toBe(LEGACY_SCHEMA_VERSION)
  })
})
