import { describe, expect, it, vi } from "vitest";

import { acquireClientCredentialsToken, isTokenValid, loginOrigin, tokenEndpoint } from "./auth";

const request = {
	loginOrigin: "https://login.microsoftonline.com",
	tenantId: "tenant-1",
	clientId: "client-1",
	clientSecret: "secret",
	resourceOrigin: "https://org.crm.dynamics.com",
};

describe("client credentials", () => {
	it("picks the login host by cloud", () => {
		expect(loginOrigin("Commercial")).toBe("https://login.microsoftonline.com");
		expect(loginOrigin("GCC")).toBe("https://login.microsoftonline.com");
		expect(loginOrigin("GCCHigh")).toBe("https://login.microsoftonline.us");
		expect(loginOrigin("DOD")).toBe("https://login.microsoftonline.us");
		expect(tokenEndpoint("https://login.microsoftonline.com", "t")).toBe("https://login.microsoftonline.com/t/oauth2/v2.0/token");
	});

	it("posts a form-encoded token request and applies an expiry margin", async () => {
		const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ access_token: "abc", expires_in: 3600 }), { status: 200 }));
		const token = await acquireClientCredentialsToken(request, fetchImpl, () => 1_000_000);
		expect(token).toEqual({ token: "abc", expiresAt: 1_000_000 + 3600 * 1000 - 60_000 });
		const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token");
		expect(init.method).toBe("POST");
		expect(init.credentials).toBe("omit");
		expect(String(init.body)).toBe(
			"grant_type=client_credentials&client_id=client-1&client_secret=secret&scope=https%3A%2F%2Forg.crm.dynamics.com%2F.default"
		);
	});

	it("reports the identity platform error description", async () => {
		const fetchImpl = vi.fn(
			async () =>
				new Response(JSON.stringify({ error: "invalid_client", error_description: "AADSTS7000215: Invalid client secret" }), {
					status: 401,
				})
		);
		await expect(acquireClientCredentialsToken(request, fetchImpl)).rejects.toThrow("AADSTS7000215: Invalid client secret");
	});

	it("validates tokens against the clock", () => {
		expect(isTokenValid({ token: "a", expiresAt: 200 }, 100)).toBe(true);
		expect(isTokenValid({ token: "a", expiresAt: 100 }, 100)).toBe(false);
		expect(isTokenValid(undefined, 100)).toBe(false);
	});
});
