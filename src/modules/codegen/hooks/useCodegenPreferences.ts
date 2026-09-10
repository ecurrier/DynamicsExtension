import { codegenPreferencesItem, useStorageItem, useStorageUpdate } from "@/shared/storage";
import { EMPTY_CODEGEN_PREFERENCES } from "@/shared/types";

import { forgetValue, rememberValue } from "../lib";

export const useCodegenPreferences = () => {
	const query = useStorageItem(codegenPreferencesItem);
	const update = useStorageUpdate(codegenPreferencesItem);
	const preferences = query.data ?? EMPTY_CODEGEN_PREFERENCES;
	const settingsFor = (templateId: string): Record<string, string> => preferences.settings[templateId] ?? {};
	const historyFor = (key: string): string[] => preferences.history[key] ?? [];
	const setSetting = (templateId: string, key: string, value: string) =>
		update.mutateAsync((current) => ({
			...current,
			settings: { ...current.settings, [templateId]: { ...current.settings[templateId], [key]: value } },
		}));
	const remember = (key: string, value: string) =>
		update.mutateAsync((current) => ({
			...current,
			history: { ...current.history, [key]: rememberValue(current.history[key] ?? [], value) },
		}));
	const forget = (key: string, value: string) =>
		update.mutateAsync((current) => ({
			...current,
			history: { ...current.history, [key]: forgetValue(current.history[key] ?? [], value) },
		}));
	return { settingsFor, historyFor, setSetting, remember, forget, isLoading: query.isLoading };
};
