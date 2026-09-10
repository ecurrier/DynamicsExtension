import { type CloudType } from "@/shared/types";

export interface ClientCredentialsRequest {
	loginOrigin: string;
	tenantId: string;
	clientId: string;
	clientSecret: string;
	resourceOrigin: string;
}

export interface AccessToken {
	token: string;
	expiresAt: number;
}

interface TokenResponse {
	access_token?: string;
	expires_in?: number;
	error?: string;
	error_description?: string;
}

const EXPIRY_MARGIN_MS = 60_000;
const DEFAULT_LIFETIME_SECONDS = 3600;

export const loginOrigin = (cloudType: CloudType): string =>
	cloudType === "GCCHigh" || cloudType === "DOD" ? "https://login.microsoftonline.us" : "https://login.microsoftonline.com";

export const tokenEndpoint = (origin: string, tenantId: string): string => `${origin}/${tenantId}/oauth2/v2.0/token`;

export const isTokenValid = (token: AccessToken | undefined | null, now = Date.now()): token is AccessToken => !!token && token.expiresAt > now;

export const acquireClientCredentialsToken = async (
	request: ClientCredentialsRequest,
	fetchImpl: typeof fetch = fetch,
	now: () => number = Date.now
): Promise<AccessToken> => {
	const body = new URLSearchParams({
		grant_type: "client_credentials",
		client_id: request.clientId,
		client_secret: request.clientSecret,
		scope: `${request.resourceOrigin}/.default`,
	});
	const response = await fetchImpl(tokenEndpoint(request.loginOrigin, request.tenantId), {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
		credentials: "omit",
	});
	const payload = (await response.json().catch(() => ({}))) as TokenResponse;
	if (!response.ok || !payload.access_token) {
		throw new Error(payload.error_description ?? payload.error ?? `The token request failed (${response.status})`);
	}
	const lifetime = (payload.expires_in ?? DEFAULT_LIFETIME_SECONDS) * 1000;
	return { token: payload.access_token, expiresAt: now() + lifetime - EXPIRY_MARGIN_MS };
};
