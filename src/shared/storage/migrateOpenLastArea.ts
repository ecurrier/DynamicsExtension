import { schemaVersionItem, settingsItem } from "./items";
import { OPEN_LAST_AREA_SCHEMA_VERSION } from "./schema";

export const migrateOpenLastArea = async (): Promise<boolean> => {
	if ((await schemaVersionItem.getValue()) >= OPEN_LAST_AREA_SCHEMA_VERSION) {
		return false;
	}
	const settings = await settingsItem.getValue();
	const adopted = settings.openLastVisitedArea === false;
	if (adopted) {
		await settingsItem.setValue({ ...settings, openLastVisitedArea: true });
	}
	await schemaVersionItem.setValue(OPEN_LAST_AREA_SCHEMA_VERSION);
	return adopted;
};
