import { type SafeContext } from "./types";

export type SurfaceKind = "popup" | "window" | "sidepanel";
export type PageKind = "model-driven-app" | "portal" | null;
export type ThemeKind = "system" | "light" | "dark";

/**
 * Deliberately plain values rather than the extension's own domain types. This module stays free
 * of `@/shared` imports so it can never drag React, Fluent or an extension API into the page or
 * background bundle, and so a test can drive it without a browser.
 */
export interface SafeContextInput {
	version: string;
	userAgent: string;
	/** `navigator.userAgentData.platform` where the browser offers it. */
	uaPlatform?: string | null;
	language: string;
	surface: SurfaceKind;
	areaId: string;
	pageContext: PageKind;
	theme: ThemeKind;
}

// Edge and Opera both carry a Chrome token, so they are tested first.
const BROWSERS: ReadonlyArray<readonly [RegExp, string]> = [
	[/Edg\/(\d+)/, "Edge"],
	[/OPR\/(\d+)/, "Opera"],
	[/Firefox\/(\d+)/, "Firefox"],
	[/Chrome\/(\d+)/, "Chrome"],
];

export const describeBrowser = (userAgent: string): string => {
	for (const [pattern, name] of BROWSERS) {
		const match = pattern.exec(userAgent);
		if (match) {
			return `${name} ${match[1]}`;
		}
	}
	return "Unknown browser";
};

// Android carries a Linux token, so it is tested first.
const PLATFORMS: ReadonlyArray<readonly [RegExp, string]> = [
	[/Windows NT/, "Windows"],
	[/Mac OS X|Macintosh/, "macOS"],
	[/CrOS/, "ChromeOS"],
	[/Android/, "Android"],
	[/Linux/, "Linux"],
];

export const describePlatform = (userAgent: string, uaPlatform?: string | null): string => {
	if (uaPlatform) {
		return uaPlatform;
	}
	for (const [pattern, name] of PLATFORMS) {
		if (pattern.test(userAgent)) {
			return name;
		}
	}
	return "Unknown platform";
};

const SURFACES: Record<SurfaceKind, string> = {
	popup: "Popup",
	window: "Pinned window",
	sidepanel: "Side panel",
};

const PAGES: Record<Exclude<PageKind, null>, string> = {
	"model-driven-app": "Model-driven app",
	portal: "Power Pages",
};

const THEMES: Record<ThemeKind, string> = {
	system: "System",
	light: "Light",
	dark: "Dark",
};

export const buildSafeContext = (input: SafeContextInput): SafeContext => ({
	version: input.version,
	browser: describeBrowser(input.userAgent),
	platform: describePlatform(input.userAgent, input.uaPlatform),
	surface: SURFACES[input.surface],
	areaId: input.areaId,
	pageContext: input.pageContext === null ? "None" : PAGES[input.pageContext],
	theme: THEMES[input.theme],
	language: input.language,
});
