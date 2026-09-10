import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";

import { CLOUD_TYPES, type CloudType, type PageContext } from "@/shared/types";

import { environmentsItem, formPresetsItem, lastVisitedAreaItem, schemaVersionItem, settingsItem } from "./items";
import { LEGACY_ENVIRONMENT_PREFIX, LEGACY_EXTENSION_SETTINGS_KEY, LEGACY_LAST_VISITED_KEY, LEGACY_TARGET_TO_AREA, LEGACY_TEMPLATE_PREFIX } from "./legacyKeys";
import { DEFAULT_SETTINGS, EMPTY_FORM_PRESETS, type Environments, type ExtensionSettings, type FormPresetsByContext, LEGACY_SCHEMA_VERSION } from "./schema";

export interface MigratedSchema {
	environments: Environments;
	formPresets: FormPresetsByContext;
	settings: ExtensionSettings;
	lastVisitedArea: string | null;
	legacyKeys: string[];
}

type LegacyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is LegacyRecord => typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const asCloudType = (value: unknown): CloudType => ((CLOUD_TYPES as readonly string[]).includes(asString(value)) ? (value as CloudType) : "Commercial");

const readFlag = (source: LegacyRecord, path: [string, string, string], fallback: boolean): boolean => {
	const [parent, group, key] = path;
	const groupRecord = isRecord(source[parent]) ? (source[parent] as LegacyRecord)[group] : undefined;
	const value = isRecord(groupRecord) ? groupRecord[key] : undefined;
	return typeof value === "boolean" ? value : fallback;
};

const isPageContext = (value: string): value is PageContext => value === "model-driven-app" || value === "portal";

export const buildSchemaFromLegacy = (raw: LegacyRecord): MigratedSchema => {
	const environments: Environments = {};
	const formPresets: FormPresetsByContext = { "model-driven-app": {}, portal: {} };
	let settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
	let lastVisitedArea: string | null = null;
	const legacyKeys: string[] = [];

	for (const [key, value] of Object.entries(raw)) {
		if (key.startsWith(LEGACY_ENVIRONMENT_PREFIX) && isRecord(value)) {
			const id = key.slice(LEGACY_ENVIRONMENT_PREFIX.length);
			environments[id] = {
				id,
				name: asString(value.environmentName),
				environmentType: asCloudType(value.environmentType),
				modelDrivenAppUrl: asString(value.modelDrivenAppUrl),
				powerPagesUrl: asString(value.powerPagesUrl),
				environmentId: asString(value.environmentId),
				notes: "",
				servicePrincipalId: null,
				alert: null,
			};
			legacyKeys.push(key);
			continue;
		}
		if (key === LEGACY_EXTENSION_SETTINGS_KEY && isRecord(value)) {
			settings = {
				...DEFAULT_SETTINGS,
				openLastVisitedArea: readFlag(value, ["Extension", "OpenLastVisitedPage", "Enabled"], DEFAULT_SETTINGS.openLastVisitedArea),
				makerPortalUseCurrentEnvironment: readFlag(
					value,
					["Utilities", "OpenMakerUrl", "DefaultEnvironment"],
					DEFAULT_SETTINGS.makerPortalUseCurrentEnvironment
				),
				adminCenterUseCurrentEnvironment: readFlag(
					value,
					["Utilities", "OpenAdminCenter", "DefaultEnvironment"],
					DEFAULT_SETTINGS.adminCenterUseCurrentEnvironment
				),
				controlEditorUseDefaultSolution: readFlag(
					value,
					["Utilities", "OpenControlEditor", "UseDefaultSolution"],
					DEFAULT_SETTINGS.controlEditorUseDefaultSolution
				),
				securityRequireRemovalConfirmation: readFlag(
					value,
					["Security", "ApplyChanges", "RequireConfirmation"],
					DEFAULT_SETTINGS.securityRequireRemovalConfirmation
				),
			};
			legacyKeys.push(key);
			continue;
		}
		if (key === LEGACY_LAST_VISITED_KEY) {
			lastVisitedArea = LEGACY_TARGET_TO_AREA[asString(value)] ?? null;
			legacyKeys.push(key);
			continue;
		}
		if (key.startsWith(LEGACY_TEMPLATE_PREFIX) && isRecord(value)) {
			const [context, id] = key.slice(LEGACY_TEMPLATE_PREFIX.length).split(".");
			if (context && id && isPageContext(context)) {
				formPresets[context][id] = {
					id,
					name: asString(value.templateName),
					fields: isRecord(value.fields) ? value.fields : {},
				};
			}
			legacyKeys.push(key);
		}
	}

	return { environments, formPresets, settings, lastVisitedArea, legacyKeys };
};

export const migrateLegacyStorage = async (): Promise<boolean> => {
	const currentVersion = await schemaVersionItem.getValue();
	if (currentVersion >= LEGACY_SCHEMA_VERSION) {
		return false;
	}
	const raw = (await browser.storage.local.get(null)) as LegacyRecord;
	const migrated = buildSchemaFromLegacy(raw);
	if (migrated.legacyKeys.length > 0) {
		await storage.setItems([
			{ item: environmentsItem, value: migrated.environments },
			{
				item: formPresetsItem,
				value:
					Object.keys(migrated.formPresets["model-driven-app"]).length + Object.keys(migrated.formPresets.portal).length > 0
						? migrated.formPresets
						: EMPTY_FORM_PRESETS,
			},
			{ item: settingsItem, value: migrated.settings },
			{ item: lastVisitedAreaItem, value: migrated.lastVisitedArea },
		]);
	}
	await schemaVersionItem.setValue(LEGACY_SCHEMA_VERSION);
	if (migrated.legacyKeys.length > 0) {
		await browser.storage.local.remove(migrated.legacyKeys);
	}
	return migrated.legacyKeys.length > 0;
};
