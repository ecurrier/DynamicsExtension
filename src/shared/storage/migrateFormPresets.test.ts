import { describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { formPresetsItem, lastVisitedAreaItem, schemaVersionItem } from "./items";
import { migrateFormPresets } from "./migrateFormPresets";
import { FORM_PRESET_SCHEMA_VERSION, SERVICE_PRINCIPAL_SCHEMA_VERSION } from "./schema";

const preset = { id: "p1", name: "Contact defaults", fields: { firstname: "A" } };

describe("migrateFormPresets", () => {
	it("moves saved templates to form presets, fixes the last visited area, and stamps the version", async () => {
		await schemaVersionItem.setValue(SERVICE_PRINCIPAL_SCHEMA_VERSION);
		await fakeBrowser.storage.local.set({
			templates: { "model-driven-app": { p1: preset }, portal: {} },
			templates$: { v: 1 },
			lastVisitedArea: "templates.templates",
		});
		expect(await migrateFormPresets()).toBe(true);
		expect((await formPresetsItem.getValue())["model-driven-app"]).toEqual({ p1: preset });
		expect(await lastVisitedAreaItem.getValue()).toBe("formpresets.presets");
		const remaining = await fakeBrowser.storage.local.get(null);
		expect("templates" in remaining).toBe(false);
		expect("templates$" in remaining).toBe(false);
		expect(await schemaVersionItem.getValue()).toBe(FORM_PRESET_SCHEMA_VERSION);
		expect(await migrateFormPresets()).toBe(false);
	});

	it("stamps the version on an install that never saved a template", async () => {
		await schemaVersionItem.setValue(SERVICE_PRINCIPAL_SCHEMA_VERSION);
		await lastVisitedAreaItem.setValue("security.roles");
		expect(await migrateFormPresets()).toBe(false);
		expect(await formPresetsItem.getValue()).toEqual({ "model-driven-app": {}, portal: {} });
		expect(await lastVisitedAreaItem.getValue()).toBe("security.roles");
		expect(await schemaVersionItem.getValue()).toBe(FORM_PRESET_SCHEMA_VERSION);
	});
});
