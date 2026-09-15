import { describe, expect, it } from "vitest";

import { schemaVersionItem, settingsItem } from "./items";
import { migrateOpenLastArea } from "./migrateOpenLastArea";
import { DEFAULT_SETTINGS, OPEN_LAST_AREA_SCHEMA_VERSION } from "./schema";

describe("migrateOpenLastArea", () => {
	it("turns the setting on for an install that still had it off", async () => {
		await settingsItem.setValue({ ...DEFAULT_SETTINGS, openLastVisitedArea: false });
		expect(await migrateOpenLastArea()).toBe(true);
		expect((await settingsItem.getValue()).openLastVisitedArea).toBe(true);
	});

	it("leaves every other setting alone", async () => {
		await settingsItem.setValue({ ...DEFAULT_SETTINGS, openLastVisitedArea: false, themeMode: "dark", securityRequireRemovalConfirmation: false });
		await migrateOpenLastArea();
		const settings = await settingsItem.getValue();
		expect(settings.themeMode).toBe("dark");
		expect(settings.securityRequireRemovalConfirmation).toBe(false);
	});

	it("runs once, so turning it off afterwards sticks", async () => {
		await settingsItem.setValue({ ...DEFAULT_SETTINGS, openLastVisitedArea: false });
		await migrateOpenLastArea();
		await settingsItem.setValue({ ...DEFAULT_SETTINGS, openLastVisitedArea: false });
		expect(await migrateOpenLastArea()).toBe(false);
		expect((await settingsItem.getValue()).openLastVisitedArea).toBe(false);
	});

	it("does nothing for an install that already has it on", async () => {
		await settingsItem.setValue({ ...DEFAULT_SETTINGS, openLastVisitedArea: true });
		expect(await migrateOpenLastArea()).toBe(false);
		expect(await schemaVersionItem.getValue()).toBe(OPEN_LAST_AREA_SCHEMA_VERSION);
	});

	it("records the schema version so later migrations still chain", async () => {
		await migrateOpenLastArea();
		expect(await schemaVersionItem.getValue()).toBe(OPEN_LAST_AREA_SCHEMA_VERSION);
	});
});
