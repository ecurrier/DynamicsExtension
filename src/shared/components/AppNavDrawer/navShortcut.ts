const applePlatform = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

export const NAV_SEARCH_SHORTCUT = applePlatform ? "⌘K" : "Ctrl+K";

export const NAV_SEARCH_KEYSHORTCUTS = applePlatform ? "Meta+K" : "Control+K";

export const isNavSearchShortcut = (event: KeyboardEvent): boolean =>
	(applePlatform ? event.metaKey : event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k";

/**
 * True when the key went to something the user is typing in. The nav shortcut must not take Ctrl+K
 * away from a text field, where the browser and the editor have their own uses for it.
 */
export const isTypingTarget = (target: EventTarget | null): boolean => {
	if (target === null || typeof target !== "object") {
		return false;
	}
	const node = target as { tagName?: string; isContentEditable?: boolean };
	const tag = (node.tagName ?? "").toLowerCase();
	return tag === "input" || tag === "textarea" || node.isContentEditable === true;
};
