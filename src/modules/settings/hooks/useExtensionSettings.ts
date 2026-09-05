import {
  DEFAULT_SETTINGS,
  type ExtensionSettings,
  settingsItem,
  useStorageItem,
  useStorageUpdate,
} from '@/shared/storage'

export const useExtensionSettings = () => {
  const query = useStorageItem(settingsItem)
  const update = useStorageUpdate(settingsItem)
  const settings: ExtensionSettings = { ...DEFAULT_SETTINGS, ...query.data }
  const setSetting = <K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) =>
    update.mutateAsync((current) => ({ ...current, [key]: value }))
  return { settings, isLoading: query.isLoading, setSetting }
}
