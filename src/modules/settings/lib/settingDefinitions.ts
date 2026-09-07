import { type ExtensionSettings, type ThemePreference } from '@/shared/storage'

type KeysOfType<T> = {
  [K in keyof ExtensionSettings]: ExtensionSettings[K] extends T ? K : never
}[keyof ExtensionSettings]

export type ToggleSettingKey = KeysOfType<boolean>
export type ThemeSettingKey = KeysOfType<ThemePreference>

interface SettingBase {
  section: string
  title: string
  label: string
  tooltip: string
}

export interface ToggleSetting extends SettingBase {
  kind: 'toggle'
  key: ToggleSettingKey
}

export interface ChoiceOptionDefinition<T extends string> {
  value: T
  label: string
  description: string
}

export interface ThemeSetting extends SettingBase {
  kind: 'choice'
  key: ThemeSettingKey
  options: ChoiceOptionDefinition<ThemePreference>[]
}

export type SettingDefinition = ToggleSetting | ThemeSetting

export const SETTING_SECTIONS = [
  'Extension',
  'Utilities',
  'Forms',
  'Security Management',
  'Environment Variables',
  'Plugin Steps',
] as const

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    kind: 'choice',
    key: 'themeMode',
    section: 'Extension',
    title: 'Appearance',
    label: 'Colour theme used by every Power Tools window',
    tooltip:
      'Match browser follows your browser and operating system setting, which means light unless you have asked for dark. Light and Dark ignore that and stay put.',
    options: [
      { value: 'system', label: 'Match browser', description: 'Follow your browser and system preference' },
      { value: 'light', label: 'Light', description: 'Always use the light theme' },
      { value: 'dark', label: 'Dark', description: 'Always use the dark theme' },
    ],
  },
  {
    kind: 'toggle',
    key: 'openLastVisitedArea',
    section: 'Extension',
    title: 'Open Last Visited Page',
    label: 'When the extension is opened, return to the last page you used',
    tooltip: 'When enabled, the last area you visited is loaded automatically when the extension opens',
  },
  {
    kind: 'toggle',
    key: 'makerPortalUseCurrentEnvironment',
    section: 'Utilities',
    title: 'Open Maker Portal',
    label: 'Default to the current environment when opening the maker portal',
    tooltip:
      'When enabled, the Maker Portal URL is selected automatically from your current environment instead of prompting',
  },
  {
    kind: 'toggle',
    key: 'controlEditorUseDefaultSolution',
    section: 'Utilities',
    title: 'Open Form/View Editor',
    label: 'Default to the Default Solution when opening the control editor',
    tooltip:
      'When enabled, controls open in the Default Solution. When disabled, you are prompted to pick an unmanaged solution',
  },
  {
    kind: 'toggle',
    key: 'adminCenterUseCurrentEnvironment',
    section: 'Utilities',
    title: 'Open Admin Center',
    label: 'Default to the current environment when opening the admin center',
    tooltip:
      'When enabled, the Power Platform Admin Center URL is selected automatically from your current environment',
  },
  {
    kind: 'toggle',
    key: 'formsRequireSaveConfirmation',
    section: 'Forms',
    title: 'Save Form XML',
    label: 'Require confirmation before saving form XML',
    tooltip: 'When enabled, a confirmation dialog appears before the form XML is overwritten in Dataverse',
  },
  {
    kind: 'toggle',
    key: 'securityRequireRemovalConfirmation',
    section: 'Security Management',
    title: 'Apply Security Role Changes',
    label: "Require confirmation when removing a user's security roles",
    tooltip: 'When enabled, a confirmation dialog appears before security roles are removed from a user',
  },
  {
    kind: 'toggle',
    key: 'environmentVariablesRequireSaveConfirmation',
    section: 'Environment Variables',
    title: 'Save Variable Values',
    label: 'Require confirmation before saving or removing an environment variable value',
    tooltip:
      'When enabled, a confirmation dialog appears before a current value is written to or removed from Dataverse',
  },
  {
    kind: 'toggle',
    key: 'pluginStepsRequireToggleConfirmation',
    section: 'Plugin Steps',
    title: 'Enable or Disable Steps',
    label: 'Require confirmation before enabling or disabling plug-in steps',
    tooltip: 'When enabled, a confirmation dialog appears before plug-in steps are switched on or off for every user',
  },
]
