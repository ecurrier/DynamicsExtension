import { type Environment } from "@/shared/storage";
import { type CloudType, type EnvironmentAlert, type EnvironmentDetails } from "@/shared/types";

export interface EnvironmentDraft {
	name: string;
	environmentType: CloudType;
	modelDrivenAppUrl: string;
	powerPagesUrl: string;
	environmentId: string;
	servicePrincipalId: string | null;
	notes: string;
	alert: EnvironmentAlert | null;
}

export type DraftField = "name" | "modelDrivenAppUrl";

export interface DraftValidation {
	field: DraftField;
	message: string;
}

export const EMPTY_DRAFT: EnvironmentDraft = {
	name: "",
	environmentType: "Commercial",
	modelDrivenAppUrl: "",
	powerPagesUrl: "",
	environmentId: "",
	servicePrincipalId: null,
	notes: "",
	alert: null,
};

export const CLOUD_TYPE_LABELS: Record<CloudType, string> = {
	Commercial: "Commercial",
	GCC: "GCC",
	GCCHigh: "GCC High",
	DOD: "DoD",
};

export const isHttpsUrl = (value: string): boolean => {
	try {
		return new URL(value.trim()).protocol === "https:";
	} catch {
		return false;
	}
};

export const defaultAlert = (name: string): EnvironmentAlert => ({
	enabled: true,
	level: 3,
	message: `You are in ${name.trim() || "this environment"}`,
	showCloseButton: true,
});

export const draftFromEnvironment = (environment: Environment): EnvironmentDraft => ({
	name: environment.name,
	environmentType: environment.environmentType,
	modelDrivenAppUrl: environment.modelDrivenAppUrl,
	powerPagesUrl: environment.powerPagesUrl,
	environmentId: environment.environmentId,
	servicePrincipalId: environment.servicePrincipalId,
	notes: environment.notes,
	alert: environment.alert,
});

export const draftFromDetails = (details: EnvironmentDetails | null | undefined): EnvironmentDraft => ({
	...EMPTY_DRAFT,
	name: details?.environmentName ?? "",
	environmentType: details?.environmentType ?? "Commercial",
	modelDrivenAppUrl: details?.modelDrivenAppUrl ?? "",
	powerPagesUrl: details?.powerPagesUrl ?? "",
	environmentId: details?.environmentId ?? "",
});

export const copyDraft = (environment: Environment): EnvironmentDraft => ({
	...draftFromEnvironment(environment),
	name: `${environment.name} (copy)`,
	environmentId: "",
});

export const validateDraft = (draft: EnvironmentDraft): DraftValidation | null => {
	if (!draft.name.trim()) {
		return { field: "name", message: "Enter an environment name" };
	}
	if (draft.servicePrincipalId && !isHttpsUrl(draft.modelDrivenAppUrl)) {
		return { field: "modelDrivenAppUrl", message: "Enter the https URL of the environment to use a service principal" };
	}
	return null;
};

export const toEnvironment = (id: string, draft: EnvironmentDraft): Environment => ({
	id,
	name: draft.name.trim(),
	environmentType: draft.environmentType,
	modelDrivenAppUrl: draft.modelDrivenAppUrl.trim(),
	powerPagesUrl: draft.powerPagesUrl.trim(),
	environmentId: draft.environmentId.trim(),
	servicePrincipalId: draft.servicePrincipalId,
	notes: draft.notes.trim(),
	alert: draft.alert ? { ...draft.alert, message: draft.alert.message.trim() } : null,
});

export const sortEnvironments = (environments: Environment[]): Environment[] => [...environments].sort((left, right) => left.name.localeCompare(right.name));
