import { browser } from "wxt/browser";

export const originPattern = (url: string): string => `${new URL(url).origin}/*`;

export const hasHostAccess = (origins: string[]): Promise<boolean> => browser.permissions.contains({ origins });

export const ensureHostAccess = async (origins: string[]): Promise<boolean> =>
	(await browser.permissions.contains({ origins })) || browser.permissions.request({ origins });
