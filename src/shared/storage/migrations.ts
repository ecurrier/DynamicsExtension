import { migrateFormPresets } from "./migrateFormPresets";
import { migrateLegacyStorage } from "./migrateLegacy";
import { migrateOpenLastArea } from "./migrateOpenLastArea";
import { migrateServicePrincipals } from "./migrateServicePrincipals";

export const runStorageMigrations = async (): Promise<void> => {
	await migrateLegacyStorage();
	await migrateServicePrincipals();
	await migrateFormPresets();
	await migrateOpenLastArea();
};
