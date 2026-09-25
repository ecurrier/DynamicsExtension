import { defineHandlers, PageError } from "@/messaging/page";
import { fetchEntityInfo, fetchJson, getEntityId, getFormContext, getXrm, requireModelDrivenApp, retrieveMultiple, retrieveMultipleOData } from "@/page/xrm";
import { buildRecordSearchQuery, mapRecordSearchRows } from "@/shared/lib";
import { type EntityInfo, type FormState, type RecordSearchResult, type RecordSnapshot } from "@/shared/types";

const FORM_TYPE_CREATE = 1;

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const requireIdentifier = (value: string, label: string): string => {
	if (!IDENTIFIER_PATTERN.test(value)) {
		throw new PageError("InvalidArgument", `${label} is not a valid name`);
	}
	return value;
};

const extractEntityName = (fetchXml: string): string => {
	const match = fetchXml.match(/<entity[^>]*name=['"]([^'"]*)['"]/);
	const entityName = match?.[1];
	if (!entityName) {
		throw new PageError("EntityNameNotFound", "Could not find an entity name in the Fetch XML");
	}
	return entityName;
};

const entityInfoCache = new Map<string, Promise<EntityInfo>>();

const getEntityInfo = (logicalName: string): Promise<EntityInfo> => {
	const cached = entityInfoCache.get(logicalName);
	if (cached) {
		return cached;
	}
	const pending = fetchEntityInfo(logicalName).catch((error: unknown) => {
		entityInfoCache.delete(logicalName);
		throw error;
	});
	entityInfoCache.set(logicalName, pending);
	return pending;
};

const searchRecords = async (info: EntityInfo, query: string, top: number): Promise<RecordSearchResult[]> => {
	const withModifiedOn = buildRecordSearchQuery(info, query, top, true);
	if (!withModifiedOn) {
		throw new PageError("NotSupported", `${info.displayName} has no primary name column to search`);
	}
	try {
		return mapRecordSearchRows(info, await retrieveMultipleOData(info.logicalName, withModifiedOn));
	} catch (error) {
		const withoutModifiedOn = buildRecordSearchQuery(info, query, top, false);
		if (!withoutModifiedOn) {
			throw error;
		}
		return mapRecordSearchRows(info, await retrieveMultipleOData(info.logicalName, withoutModifiedOn));
	}
};

const requireSavedRecord = (): Xrm.Page => {
	const formContext = getFormContext();
	if (formContext.ui.getFormType() === FORM_TYPE_CREATE) {
		throw new PageError("NotSupported", "Save the record before updating its columns through the Web API");
	}
	return formContext;
};

export const webApiHandlers = defineHandlers({
	"webapi.getRecordValues": async (): Promise<RecordSnapshot> => {
		const formContext = getFormContext();
		const entityName = formContext.data.entity.getEntityName();
		if (formContext.ui.getFormType() === FORM_TYPE_CREATE) {
			return { entityName, recordId: null, values: {} };
		}
		const recordId = getEntityId(formContext);
		const record = await getXrm().WebApi.retrieveRecord(entityName, recordId);
		return { entityName, recordId, values: (record ?? {}) as Record<string, unknown> };
	},
	"webapi.getFormState": (): FormState => {
		const formContext = getFormContext();
		return {
			recordId: formContext.ui.getFormType() === FORM_TYPE_CREATE ? null : getEntityId(formContext),
			isDirty: formContext.data.entity.getIsDirty(),
		};
	},
	"webapi.saveRecord": async ({ payload }) => {
		const formContext = requireSavedRecord();
		const info = await getEntityInfo(formContext.data.entity.getEntityName());
		await fetchJson<void>(`${info.entitySetName}(${getEntityId(formContext)})`, {
			method: "PATCH",
			body: payload,
			headers: { "If-Match": "*" },
		});
	},
	"webapi.refreshForm": async () => {
		await getFormContext().data.refresh(false);
	},
	"webapi.getEntityInfo": ({ logicalName }) => {
		requireModelDrivenApp();
		return getEntityInfo(requireIdentifier(logicalName, "Table name"));
	},
	"webapi.searchRecords": async ({ entityLogicalName, query, top }) => {
		requireModelDrivenApp();
		const info = await getEntityInfo(requireIdentifier(entityLogicalName, "Table name"));
		return searchRecords(info, query, Math.min(Math.max(1, Math.trunc(top)), 100));
	},
	"webapi.executeFetchXml": async ({ fetchXml }) => {
		requireModelDrivenApp();
		return retrieveMultiple(extractEntityName(fetchXml), fetchXml);
	},
});
