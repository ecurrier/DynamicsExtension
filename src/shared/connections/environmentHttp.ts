import { invokeBackground } from "@/messaging/client";
import { ensureHostAccess } from "@/shared/extension";
import { type AccessToken, acquireClientCredentialsToken, createDataverseHttp, type DataverseHttp, isTokenValid, loginOrigin } from "@/shared/lib";
import { type Environment, type ServicePrincipal } from "@/shared/storage";

import { resolveServicePrincipal } from "./servicePrincipals";
import { getCachedToken, setCachedToken } from "./tokenCache";

export interface EnvironmentHttpOptions {
	forceRefresh?: boolean;
	timeoutMs?: number;
}

export const environmentOrigin = (environment: Environment): string => {
	try {
		return new URL(environment.modelDrivenAppUrl.trim()).origin;
	} catch {
		throw new Error(`${environment.name} does not have a valid environment URL`);
	}
};

export const tokenCacheKey = (principal: ServicePrincipal, environment: Environment): string => `${principal.id}:${environmentOrigin(environment)}`;

export const resolveEnvironmentToken = async (environment: Environment, principal: ServicePrincipal, forceRefresh = false): Promise<AccessToken> => {
	const key = tokenCacheKey(principal, environment);
	if (!forceRefresh) {
		const cached = await getCachedToken(key);
		if (cached) {
			return cached;
		}
	}
	await invokeBackground("auth.ensureTokenOriginRule", undefined);
	const token = await acquireClientCredentialsToken({
		loginOrigin: loginOrigin(environment.environmentType),
		tenantId: principal.tenantId,
		clientId: principal.clientId,
		clientSecret: principal.clientSecret,
		resourceOrigin: environmentOrigin(environment),
	});
	await setCachedToken(key, token);
	return token;
};

export const requestEnvironmentAccess = (environment: Environment): Promise<boolean> =>
	ensureHostAccess([`${environmentOrigin(environment)}/*`, `${loginOrigin(environment.environmentType)}/*`]);

const missingPrincipalMessage = (environment: Environment): string =>
	environment.servicePrincipalId
		? `The service principal assigned to ${environment.name} no longer exists`
		: `${environment.name} has no service principal configured`;

export const getEnvironmentHttp = async (environment: Environment, options: EnvironmentHttpOptions = {}): Promise<DataverseHttp> => {
	const origin = environmentOrigin(environment);
	const principal = await resolveServicePrincipal(environment);
	if (!principal) {
		throw new Error(missingPrincipalMessage(environment));
	}
	if (!(await requestEnvironmentAccess(environment))) {
		throw new Error("Power Tools needs permission to contact the environment and the Microsoft login service");
	}
	let refresh = options.forceRefresh ?? false;
	let current: AccessToken | null = null;
	return createDataverseHttp({
		origin,
		timeoutMs: options.timeoutMs,
		headers: async () => {
			if (refresh || !isTokenValid(current)) {
				current = await resolveEnvironmentToken(environment, principal, refresh);
				refresh = false;
			}
			return { Authorization: `Bearer ${current.token}` };
		},
	});
};
