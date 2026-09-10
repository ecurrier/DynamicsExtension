import { useMemo } from "react";

import { connectionKeys, getEnvironmentHttp } from "@/shared/connections";
import { transportOperations, type TransportOperations } from "@/shared/lib";
import { type Environment } from "@/shared/storage";

export type TargetOperations = () => Promise<TransportOperations>;

export const targetKey = (environmentId: string, name: string, args?: unknown) => connectionKeys.operation(environmentId, `transport.${name}`, args);

export const useTargetOperations = (environment: Environment | null): TargetOperations | null =>
	useMemo(() => (environment ? () => getEnvironmentHttp(environment).then(transportOperations) : null), [environment]);
