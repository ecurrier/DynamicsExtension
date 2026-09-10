import { useEffect, useState } from "react";

import { DEFAULT_SETTINGS, type ExtensionSettings, settingsItem, type ThemePreference } from "@/shared/storage";

const readPreference = (settings: ExtensionSettings | null | undefined): ThemePreference => settings?.themeMode ?? DEFAULT_SETTINGS.themeMode;

export const useThemePreference = (): ThemePreference => {
	const [preference, setPreference] = useState<ThemePreference>(DEFAULT_SETTINGS.themeMode);
	useEffect(() => {
		let active = true;
		void settingsItem.getValue().then((settings) => {
			if (active) {
				setPreference(readPreference(settings));
			}
		});
		const unwatch = settingsItem.watch((settings) => setPreference(readPreference(settings)));
		return () => {
			active = false;
			unwatch();
		};
	}, []);
	return preference;
};
