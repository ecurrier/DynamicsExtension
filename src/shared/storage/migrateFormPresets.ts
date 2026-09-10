import { browser } from "wxt/browser";

import { formPresetsItem, lastVisitedAreaItem, schemaVersionItem } from "./items";
import { EMPTY_FORM_PRESETS, FORM_PRESET_SCHEMA_VERSION, type FormPresetsByContext } from "./schema";

const LEGACY_ITEM_KEYS = ["templates", "templates$"];
const LEGACY_AREA_ID = "templates.templates";
const FORM_PRESETS_AREA_ID = "formpresets.presets";

const isPresetsByContext = (value: unknown): value is FormPresetsByContext =>
	typeof value === "object" && value !== null && "model-driven-app" in value && "portal" in value;

export const migrateFormPresets = async (): Promise<boolean> => {
	if ((await schemaVersionItem.getValue()) >= FORM_PRESET_SCHEMA_VERSION) {
		return false;
	}
	const templates: unknown = (await browser.storage.local.get(LEGACY_ITEM_KEYS)).templates;
	let moved = false;
	if (isPresetsByContext(templates)) {
		await formPresetsItem.setValue({ ...EMPTY_FORM_PRESETS, ...templates });
		moved = true;
	}
	if ((await lastVisitedAreaItem.getValue()) === LEGACY_AREA_ID) {
		await lastVisitedAreaItem.setValue(FORM_PRESETS_AREA_ID);
	}
	await browser.storage.local.remove(LEGACY_ITEM_KEYS);
	await schemaVersionItem.setValue(FORM_PRESET_SCHEMA_VERSION);
	return moved;
};
