import { DataverseOperationError } from "./errors";
import { isGuid, normalizeGuid } from "../guid";

const LOGICAL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,127}$/;

export const requireGuid = (value: string, label: string): string => {
	if (!isGuid(value)) {
		throw new DataverseOperationError("InvalidArgument", `${label} is not a valid identifier`);
	}
	return normalizeGuid(value);
};

export const requireLogicalName = (value: string, label: string): string => {
	const logicalName = value.trim().toLowerCase();
	if (!LOGICAL_NAME_PATTERN.test(logicalName)) {
		throw new DataverseOperationError("InvalidArgument", `${label} is not a valid logical name`);
	}
	return logicalName;
};
