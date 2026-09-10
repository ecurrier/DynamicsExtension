import {
	type ClearEnvironmentVariableValueRequest,
	ENVIRONMENT_VARIABLE_TYPES,
	type EnvironmentVariable,
	type EnvironmentVariableType,
	type EnvironmentVariableValueResult,
	type SetEnvironmentVariableValueRequest,
} from "@/shared/types";

import { DataverseOperationError } from "./errors";
import { requireGuid } from "./guards";
import { type DataverseHttp } from "./http";
import { normalizeGuid } from "../guid";

const VALUE_EXPAND = "environmentvariabledefinition_environmentvariablevalue";

const definitionsPath = [
	"environmentvariabledefinitions?$select=environmentvariabledefinitionid,schemaname,displayname,description,type,",
	"defaultvalue,ismanaged,statecode,hint,valueschema",
	`&$expand=${VALUE_EXPAND}($select=environmentvariablevalueid,value)`,
	"&$filter=statecode eq 0&$orderby=displayname asc",
].join("");

interface ValueRecord {
	environmentvariablevalueid: string;
	value?: string | null;
}

interface DefinitionRecord {
	environmentvariabledefinitionid: string;
	schemaname: string;
	displayname?: string | null;
	description?: string | null;
	type?: number | null;
	defaultvalue?: string | null;
	ismanaged?: boolean | null;
	hint?: string | null;
	valueschema?: string | null;
	[VALUE_EXPAND]?: ValueRecord[] | null;
}

const isVariableType = (value: number | null | undefined): value is EnvironmentVariableType =>
	(ENVIRONMENT_VARIABLE_TYPES as readonly number[]).includes(value ?? -1);

const toVariable = (record: DefinitionRecord): EnvironmentVariable | null => {
	if (!isVariableType(record.type)) {
		return null;
	}
	const value = record[VALUE_EXPAND]?.[0] ?? null;
	return {
		id: normalizeGuid(record.environmentvariabledefinitionid),
		schemaName: record.schemaname,
		displayName: record.displayname || record.schemaname,
		description: record.description ?? null,
		type: record.type,
		defaultValue: record.defaultvalue ?? null,
		currentValue: value?.value ?? null,
		valueId: value ? normalizeGuid(value.environmentvariablevalueid) : null,
		isManaged: record.ismanaged === true,
		hint: record.hint ?? null,
		valueSchema: record.valueschema ?? null,
	};
};

export interface EnvironmentVariableOperations {
	getDefinitions: () => Promise<EnvironmentVariable[]>;
	setValue: (request: SetEnvironmentVariableValueRequest) => Promise<EnvironmentVariableValueResult>;
	clearValue: (request: ClearEnvironmentVariableValueRequest) => Promise<void>;
}

export const environmentVariableOperations = (http: DataverseHttp): EnvironmentVariableOperations => ({
	getDefinitions: async () => {
		const response = await http.get<{ value?: DefinitionRecord[] }>(definitionsPath);
		return (response?.value ?? []).flatMap((record) => {
			const variable = toVariable(record);
			return variable ? [variable] : [];
		});
	},
	setValue: async ({ definitionId, valueId, value }) => {
		if (valueId) {
			const id = requireGuid(valueId, "Value");
			await http.patch(`environmentvariablevalues(${id})`, { value });
			return { valueId: id };
		}
		const id = requireGuid(definitionId, "Definition");
		const created = await http.request<ValueRecord | undefined>(
			"POST",
			"environmentvariablevalues",
			{ value, "EnvironmentVariableDefinitionId@odata.bind": `/environmentvariabledefinitions(${id})` },
			{ Prefer: "return=representation" }
		);
		if (!created?.environmentvariablevalueid) {
			throw new DataverseOperationError("NotFound", "Dataverse did not return the id of the new value");
		}
		return { valueId: normalizeGuid(created.environmentvariablevalueid) };
	},
	clearValue: async ({ valueId }) => {
		await http.delete(`environmentvariablevalues(${requireGuid(valueId, "Value")})`);
	},
});
