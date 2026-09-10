import { defineHandlers } from "@/messaging/page";
import { fetchJson, getEntityId, getFormContext, getGlobalContext, getPageKind, getXrm, pageHttp } from "@/page/xrm";
import { normalizeGuid } from "@/shared/lib";
import { type SessionSnapshot } from "@/shared/types";

import { currentEntityName } from "./pageQuery";

const TRACE_SETTING_LABELS: Record<number, string> = {
	0: "Off",
	1: "Exception",
	2: "All",
};

interface OrganizationRecord {
	isauditenabled?: boolean | null;
	plugintracelogsetting?: number | null;
	isduplicatedetectionenabled?: boolean | null;
}

const describe = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

const readOrganizationSettings = async (): Promise<{
	record: OrganizationRecord | null;
	backgroundProcessingDisabled: boolean | null;
	warning: string | null;
}> => {
	let record: OrganizationRecord | null = null;
	let warning: string | null = null;
	try {
		const response = await fetchJson<{ value?: OrganizationRecord[] }>(
			"organizations?$select=isauditenabled,plugintracelogsetting,isduplicatedetectionenabled&$top=1"
		);
		record = response?.value?.[0] ?? null;
	} catch (error) {
		warning = `Organization settings could not be read: ${describe(error)}`;
	}
	let backgroundProcessingDisabled: boolean | null = null;
	try {
		const response = await fetchJson<{ value?: { disablebackgroundprocessing?: boolean | null }[] }>(
			"organizations?$select=disablebackgroundprocessing&$top=1"
		);
		backgroundProcessingDisabled = response?.value?.[0]?.disablebackgroundprocessing ?? null;
	} catch {
		backgroundProcessingDisabled = null;
	}
	return { record, backgroundProcessingDisabled, warning };
};

const readUserContext = async (userId: string): Promise<{ businessUnitName: string | null; teams: string[]; warning: string | null }> => {
	try {
		const http = pageHttp();
		const [user, teams] = await Promise.all([
			http.get<{ businessunitid?: { name?: string | null } | null }>(`systemusers(${userId})?$select=systemuserid&$expand=businessunitid($select=name)`),
			http.get<{ value?: { name?: string | null }[] }>(`systemusers(${userId})/teammembership_association?$select=name`),
		]);
		return {
			businessUnitName: user?.businessunitid?.name ?? null,
			teams: (teams?.value ?? []).map((team) => team.name ?? "").filter((name) => name.length > 0),
			warning: null,
		};
	} catch (error) {
		return {
			businessUnitName: null,
			teams: [],
			warning: `Business unit and teams could not be read: ${describe(error)}`,
		};
	}
};

const traceSettingLabel = (value: number | null | undefined): string | null =>
	value === null || value === undefined ? null : (TRACE_SETTING_LABELS[value] ?? "Unknown");

export const sessionSnapshotHandlers = defineHandlers({
	"utilities.getSessionSnapshot": async (): Promise<SessionSnapshot> => {
		const xrm = getXrm();
		const globalContext = getGlobalContext();
		const userSettings = globalContext.userSettings;
		const userId = normalizeGuid(userSettings.userId);
		const warnings: string[] = [];

		const [organization, userContext] = await Promise.all([readOrganizationSettings(), readUserContext(userId)]);
		if (organization.warning) {
			warnings.push(organization.warning);
		}
		if (userContext.warning) {
			warnings.push(userContext.warning);
		}

		let app: SessionSnapshot["app"] = { id: null, name: null, uniqueName: null };
		try {
			const properties = await xrm.Utility.getGlobalContext().getCurrentAppProperties();
			app = {
				id: properties.appId ? normalizeGuid(properties.appId) : null,
				name: properties.displayName ?? null,
				uniqueName: properties.uniqueName ?? null,
			};
		} catch {
			warnings.push("The current app could not be identified.");
		}

		const pageKind = getPageKind();
		const formContext = pageKind === "form" ? getFormContext() : null;
		const currentForm = formContext?.ui.formSelector.getCurrentItem();

		return {
			user: {
				id: userId,
				name: userSettings.userName,
				businessUnitId: null,
				businessUnitName: userContext.businessUnitName,
				roles: [...(userSettings.roles?.get() ?? [])].map((role) => role.name ?? "").filter((name) => name.length > 0),
				teams: userContext.teams,
			},
			organization: {
				version: globalContext.getVersion(),
				isAuditEnabled: organization.record?.isauditenabled ?? null,
				pluginTraceLogSetting: traceSettingLabel(organization.record?.plugintracelogsetting),
				isDuplicateDetectionEnabled: organization.record?.isduplicatedetectionenabled ?? null,
				backgroundProcessingDisabled: organization.backgroundProcessingDisabled,
			},
			app,
			page: {
				kind: pageKind,
				entityLogicalName: formContext ? formContext.data.entity.getEntityName() : currentEntityName(),
				recordId: formContext ? getEntityId(formContext) : null,
				formId: currentForm ? normalizeGuid(currentForm.getId()) : null,
				formName: currentForm?.getLabel() ?? null,
			},
			client: {
				client: xrm.Utility.getGlobalContext().client.getClient(),
				formFactor: String(xrm.Utility.getGlobalContext().client.getFormFactor()),
				languageId: userSettings.languageId ?? null,
				timeZone: String(userSettings.getTimeZoneOffsetMinutes?.() ?? ""),
				baseCurrency: globalContext.organizationSettings.baseCurrency?.name ?? null,
			},
			warnings,
		};
	},
});
