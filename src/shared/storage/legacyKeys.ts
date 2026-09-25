export const LEGACY_ENVIRONMENT_PREFIX = "Settings.environments.";
export const LEGACY_EXTENSION_SETTINGS_KEY = "Settings.extension";
export const LEGACY_LAST_VISITED_KEY = "Extension.OpenLastVisitedPage.Target";
export const LEGACY_TEMPLATE_PREFIX = "Templates.";

export const LEGACY_TARGET_TO_AREA: Record<string, string> = {
	"#utilities-admin-content": "utilities.admin",
	"#utilities-developer-content": "utilities.developer",
	"#templates-content": "formpresets.presets",
	"#webapi-update-fields-content": "webapi.record-columns",
	"#webapi-retrieve-records-content": "webapi.retrieve-records",
	"#security-content": "security.roles",
	"#settings-environments-content": "settings.environments",
	"#settings-extension-settings-content": "settings.extension",
};
