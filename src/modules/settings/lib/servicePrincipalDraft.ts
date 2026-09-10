import { type Environment, type ServicePrincipal } from "@/shared/storage";

export interface ServicePrincipalDraft {
	name: string;
	tenantId: string;
	clientId: string;
	clientSecret: string;
	notes: string;
}

export type PrincipalField = "name" | "tenantId" | "clientId" | "clientSecret";

export interface PrincipalValidation {
	field: PrincipalField;
	message: string;
}

export const EMPTY_PRINCIPAL_DRAFT: ServicePrincipalDraft = {
	name: "",
	tenantId: "",
	clientId: "",
	clientSecret: "",
	notes: "",
};

export const validatePrincipalDraft = (draft: ServicePrincipalDraft): PrincipalValidation | null => {
	if (!draft.name.trim()) {
		return { field: "name", message: "Enter a name for the service principal" };
	}
	if (!draft.tenantId.trim()) {
		return { field: "tenantId", message: "Enter the tenant id" };
	}
	if (!draft.clientId.trim()) {
		return { field: "clientId", message: "Enter the application (client) id" };
	}
	if (!draft.clientSecret.trim()) {
		return { field: "clientSecret", message: "Enter the client secret" };
	}
	return null;
};

export const toServicePrincipal = (id: string, draft: ServicePrincipalDraft): ServicePrincipal => ({
	id,
	name: draft.name.trim(),
	tenantId: draft.tenantId.trim(),
	clientId: draft.clientId.trim(),
	clientSecret: draft.clientSecret.trim(),
	notes: draft.notes.trim(),
});

export const draftFromServicePrincipal = (principal: ServicePrincipal): ServicePrincipalDraft => ({
	name: principal.name,
	tenantId: principal.tenantId,
	clientId: principal.clientId,
	clientSecret: principal.clientSecret,
	notes: principal.notes,
});

export const sortServicePrincipals = (principals: ServicePrincipal[]): ServicePrincipal[] =>
	[...principals].sort((left, right) => left.name.localeCompare(right.name));

export const environmentsUsingPrincipal = (principalId: string, environments: Environment[]): Environment[] =>
	environments.filter((environment) => environment.servicePrincipalId === principalId);
