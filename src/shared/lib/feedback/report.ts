import { type CrashNote, type FeedbackDraft, type FeedbackKind, type SafeContext } from "./types";

/** The Area that owns the feedback form. Lives here so the nav drawer can reach it without
 * importing a module, which would close a barrel cycle. */
export const FEEDBACK_AREA_ID = "settings.feedback";

export const FEEDBACK_REPO_URL = "https://github.com/ecurrier/DynamicsExtension";
export const FEEDBACK_ISSUES_URL = `${FEEDBACK_REPO_URL}/issues`;
export const FEEDBACK_PRIVACY_URL = `${FEEDBACK_REPO_URL}/blob/main/PRIVACY.md`;

/**
 * Raw characters of report body. A prefilled GitHub URL has to survive percent-encoding, which
 * roughly doubles a body full of newlines and indentation, so this sits well below the URL ceiling
 * rather than at it. Past the limit the Area offers Copy instead, and the user's words are never
 * silently truncated.
 */
export const REPORT_LIMIT = 4000;

/** Where the counter appears, so a two-line report never has one looming over it. */
export const REPORT_COUNTER_FROM = 3200;

const URL_CEILING = 8000;
const TITLE_LIMIT = 70;

const BUG_PROMPTS = [
	["doing", "What were you doing?"],
	["happened", "What happened?"],
	["expected", "What did you expect?"],
] as const;

const IDEA_PROMPTS = [
	["goal", "What are you trying to accomplish?"],
	["help", "What would help?"],
] as const;

export const bugPrompts = BUG_PROMPTS;
export const ideaPrompts = IDEA_PROMPTS;

const section = (heading: string, body: string): string => {
	const text = body.trim();
	return text === "" ? "" : `### ${heading}\n\n${text}\n\n`;
};

const crashSection = (crash: CrashNote | null): string => {
	if (crash === null) {
		return "";
	}
	const detail = crash.detail.trim();
	const stack = crash.stack.trim();
	const described = detail === "" ? "_The reporter removed the error text._" : detail;
	return stack === "" ? `### Crash\n\n${described}\n\n` : `### Crash\n\n${described}\n\n\`\`\`\n${stack}\n\`\`\`\n\n`;
};

const contextSection = (kind: FeedbackKind, context: SafeContext): string => {
	// An Idea carries the version only: browser and OS say nothing about a feature request, but
	// "already shipped in 2.6" does.
	const rows: ReadonlyArray<readonly [string, string]> =
		kind === "idea"
			? [["Power Tools", context.version]]
			: [
					["Power Tools", context.version],
					["Browser", context.browser],
					["Platform", context.platform],
					["Surface", context.surface],
					["Area", context.areaId],
					["Page", context.pageContext],
					["Theme", context.theme],
					["Language", context.language],
				];
	return `### Context\n\n${rows.map(([label, value]) => `- ${label}: ${value}`).join("\n")}\n`;
};

/** The generated report. What the user sees in the preview is what gets posted, verbatim. */
export const composeReport = (draft: FeedbackDraft, context: SafeContext): string => {
	const answers =
		draft.kind === "bug"
			? BUG_PROMPTS.map(([key, prompt]) => section(prompt, draft.bug[key])).join("")
			: IDEA_PROMPTS.map(([key, prompt]) => section(prompt, draft.idea[key])).join("");
	const crash = draft.kind === "bug" ? crashSection(draft.crash) : "";
	return `${answers}${crash}${contextSection(draft.kind, context)}`;
};

export const composeTitle = (draft: FeedbackDraft): string => {
	const prefix = draft.kind === "bug" ? "[Bug]" : "[Idea]";
	const lead = draft.kind === "bug" ? draft.bug.doing : draft.idea.goal;
	const firstLine = lead.trim().split("\n")[0]?.trim() ?? "";
	if (firstLine === "") {
		return prefix;
	}
	const trimmed = firstLine.length > TITLE_LIMIT ? `${firstLine.slice(0, TITLE_LIMIT - 1).trimEnd()}\u2026` : firstLine;
	return `${prefix} ${trimmed}`;
};

export interface IssueLink {
	url: string;
	/** False when the prefilled URL would be too long to trust. The Area then offers Copy. */
	withinLimit: boolean;
}

/**
 * No `template` parameter: GitHub's precedence between a named template and a prefilled `body` is
 * not something we can rely on, and the templates exist for people who arrive at the Issues tab
 * cold. The title prefix does the routing a label would.
 */
export const buildIssueUrl = (title: string, body: string): IssueLink => {
	const params = new URLSearchParams({ title, body });
	const url = `${FEEDBACK_REPO_URL}/issues/new?${params.toString()}`;
	return { url, withinLimit: body.length <= REPORT_LIMIT && url.length <= URL_CEILING };
};
