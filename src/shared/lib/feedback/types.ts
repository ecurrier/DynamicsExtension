export type FeedbackKind = "bug" | "idea";

/** What an Area crash leaves behind for the user to report. */
export interface CrashNote {
	/**
	 * The error name and message, shown to the user as editable text. This is the one field that
	 * can carry a value interpolated from their environment, so it is never sent unreviewed.
	 */
	detail: string;
	/** The stack: a walk through our own bundle, which is public on GitHub. */
	stack: string;
}

export interface BugAnswers {
	doing: string;
	happened: string;
	expected: string;
}

export interface IdeaAnswers {
	goal: string;
	help: string;
}

export interface FeedbackDraft {
	kind: FeedbackKind;
	bug: BugAnswers;
	idea: IdeaAnswers;
	/** The report once the user has edited it by hand; null while it still tracks the answers. */
	edited: string | null;
	crash: CrashNote | null;
}

export const EMPTY_FEEDBACK_DRAFT: FeedbackDraft = {
	kind: "bug",
	bug: { doing: "", happened: "", expected: "" },
	idea: { goal: "", help: "" },
	edited: null,
	crash: null,
};

/**
 * The automatic context a report carries. Every field is either the user's own machine or one of
 * our own identifiers: nothing here is read from their Dynamics environment. Table and column
 * names are excluded even though they look harmless, because a custom schema name carries a
 * publisher prefix that names the client. See `.scratch/feedback/spec.md`.
 */
export interface SafeContext {
	version: string;
	browser: string;
	platform: string;
	surface: string;
	areaId: string;
	pageContext: string;
	theme: string;
	language: string;
}
