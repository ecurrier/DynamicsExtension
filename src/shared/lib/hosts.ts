const ORG_HOST_SUFFIXES = [".dynamics.com", ".microsoftdynamics.us", ".appsplatform.us"];

export const ORG_HOST_PATTERNS = ORG_HOST_SUFFIXES.map((suffix) => `https://*${suffix}/*`);

export const isOrgUrl = (url: string | null | undefined): boolean => {
	if (!url) {
		return false;
	}
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" && ORG_HOST_SUFFIXES.some((suffix) => parsed.hostname.endsWith(suffix));
	} catch {
		return false;
	}
};
