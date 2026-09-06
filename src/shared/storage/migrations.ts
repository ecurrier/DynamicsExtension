import { migrateLegacyStorage } from './migrateLegacy'
import { migrateServicePrincipals } from './migrateServicePrincipals'

export const runStorageMigrations = async (): Promise<void> => {
  await migrateLegacyStorage()
  await migrateServicePrincipals()
}
