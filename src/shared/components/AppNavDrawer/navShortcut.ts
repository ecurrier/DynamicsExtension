const applePlatform = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export const NAV_SEARCH_SHORTCUT = applePlatform ? "⌘K" : "Ctrl+K";

export const NAV_SEARCH_KEYSHORTCUTS = applePlatform ? "Meta+K" : "Control+K";

export const isNavSearchShortcut = (event: KeyboardEvent): boolean =>
	(applePlatform ? event.metaKey : event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k";
