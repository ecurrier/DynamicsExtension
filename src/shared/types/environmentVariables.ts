export type EnvironmentVariableType = 100000000 | 100000001 | 100000002 | 100000003 | 100000004 | 100000005;

export const ENVIRONMENT_VARIABLE_TYPES: readonly EnvironmentVariableType[] = [100000000, 100000001, 100000002, 100000003, 100000004, 100000005];

export const ENVIRONMENT_VARIABLE_TYPE_LABELS: Record<EnvironmentVariableType, string> = {
	100000000: "String",
	100000001: "Number",
	100000002: "Boolean",
	100000003: "JSON",
	100000004: "Data Source",
	100000005: "Secret",
};

export interface EnvironmentVariable {
	id: string;
	schemaName: string;
	displayName: string;
	description: string | null;
	type: EnvironmentVariableType;
	defaultValue: string | null;
	currentValue: string | null;
	valueId: string | null;
	isManaged: boolean;
	hint: string | null;
	valueSchema: string | null;
}

export interface SetEnvironmentVariableValueRequest {
	definitionId: string;
	valueId: string | null;
	value: string;
}

export interface EnvironmentVariableValueResult {
	valueId: string;
}

export interface ClearEnvironmentVariableValueRequest {
	valueId: string;
}
