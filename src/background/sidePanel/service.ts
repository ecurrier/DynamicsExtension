import { applySidePanelBehavior } from "@/shared/extension";
import { DEFAULT_SETTINGS, type ExtensionSettings, settingsItem } from "@/shared/storage";

export const sidePanelBehavior = (settings: Partial<ExtensionSettings> | null | undefined): boolean =>
	({ ...DEFAULT_SETTINGS, ...settings }).openSidePanelOnActionClick === true;

const apply = (settings: Partial<ExtensionSettings> | null | undefined): Promise<void> =>
	applySidePanelBehavior(sidePanelBehavior(settings)).catch(() => undefined);

export const reconcileSidePanelBehavior = async (): Promise<void> => {
	await apply(await settingsItem.getValue().catch(() => null));
};

export const watchSidePanelBehavior = (): void => {
	settingsItem.watch((settings) => {
		void apply(settings);
	});
};
