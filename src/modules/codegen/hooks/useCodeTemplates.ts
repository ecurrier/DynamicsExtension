import { useMemo } from "react";

import { codeTemplateDefaultsItem, codeTemplatesItem, useStorageItem, useStorageUpdate } from "@/shared/storage";
import { type Template, type TemplateDefaults, type TemplateKind } from "@/shared/types";

import { BUILTIN_TEMPLATES } from "../builtins";

const EMPTY_DEFAULTS: TemplateDefaults = {};

const isBuiltInId = (id: string): boolean => BUILTIN_TEMPLATES.some((template) => template.id === id);

export const useCodeTemplates = () => {
	const templatesQuery = useStorageItem(codeTemplatesItem);
	const defaultsQuery = useStorageItem(codeTemplateDefaultsItem);
	const updateTemplates = useStorageUpdate(codeTemplatesItem);
	const updateDefaults = useStorageUpdate(codeTemplateDefaultsItem);
	const stored = useMemo(() => Object.values(templatesQuery.data ?? {}).sort((left, right) => left.name.localeCompare(right.name)), [templatesQuery.data]);
	const templates = useMemo(() => [...BUILTIN_TEMPLATES, ...stored], [stored]);
	const byId = useMemo<Record<string, Template>>(() => Object.fromEntries(templates.map((template) => [template.id, template])), [templates]);
	const defaults = defaultsQuery.data ?? EMPTY_DEFAULTS;
	const defaultFor = (kind: TemplateKind): Template | null => {
		const starredId = defaults[kind];
		const starred = starredId ? byId[starredId] : undefined;
		if (starred && starred.kind === kind) {
			return starred;
		}
		return BUILTIN_TEMPLATES.find((template) => template.kind === kind) ?? null;
	};
	const upsert = (template: Template) => {
		if (template.builtIn || isBuiltInId(template.id)) {
			return Promise.reject(new Error("Built-in templates cannot be changed"));
		}
		return updateTemplates.mutateAsync((current) => ({ ...current, [template.id]: template }));
	};
	const remove = (id: string) => {
		if (isBuiltInId(id)) {
			return Promise.reject(new Error("Built-in templates cannot be removed"));
		}
		return updateTemplates.mutateAsync((current) => {
			const next = { ...current };
			delete next[id];
			return next;
		});
	};
	const setDefault = (kind: TemplateKind, id: string | null) =>
		updateDefaults.mutateAsync((current) => {
			if (id === null) {
				const next = { ...current };
				delete next[kind];
				return next;
			}
			return { ...current, [kind]: id };
		});
	return {
		templates,
		byId,
		defaults,
		defaultFor,
		isLoading: templatesQuery.isLoading || defaultsQuery.isLoading,
		upsert,
		remove,
		setDefault,
		isSaving: updateTemplates.isPending || updateDefaults.isPending,
	};
};
