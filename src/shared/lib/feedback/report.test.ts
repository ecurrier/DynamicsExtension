import { describe, expect, it } from "vitest";

import { buildIssueUrl, composeReport, composeTitle, REPORT_LIMIT } from "./report";
import { EMPTY_FEEDBACK_DRAFT, type FeedbackDraft, type SafeContext } from "./types";

const CONTEXT: SafeContext = {
	version: "2.5.0",
	browser: "Edge 131",
	platform: "Windows",
	surface: "Side panel",
	areaId: "webapi.record-columns",
	pageContext: "Model-driven app",
	theme: "System",
	language: "en-GB",
};

const bug = (over: Partial<FeedbackDraft["bug"]> = {}, rest: Partial<FeedbackDraft> = {}): FeedbackDraft => ({
	...EMPTY_FEEDBACK_DRAFT,
	kind: "bug",
	bug: { doing: "Opening Record Columns", happened: "It showed nothing", expected: "The columns", ...over },
	...rest,
});

const idea = (): FeedbackDraft => ({
	...EMPTY_FEEDBACK_DRAFT,
	kind: "idea",
	idea: { goal: "Compare two environments", help: "A side-by-side view" },
});

describe("composeReport, for a bug", () => {
	it("asks each question it got an answer to", () => {
		const report = composeReport(bug(), CONTEXT);
		expect(report).toContain("### What were you doing?");
		expect(report).toContain("Opening Record Columns");
		expect(report).toContain("### What did you expect?");
	});

	it("leaves out a question nobody answered, rather than printing an empty heading", () => {
		const report = composeReport(bug({ expected: "   " }), CONTEXT);
		expect(report).not.toContain("### What did you expect?");
	});

	it("carries the whole safe context", () => {
		const report = composeReport(bug(), CONTEXT);
		for (const value of Object.values(CONTEXT)) {
			expect(report).toContain(value);
		}
	});
});

describe("composeReport, for an idea", () => {
	it("carries the version and nothing else about the machine", () => {
		const report = composeReport(idea(), CONTEXT);
		expect(report).toContain("- Power Tools: 2.5.0");
		for (const value of ["Edge 131", "Windows", "Side panel", "webapi.record-columns", "Model-driven app", "en-GB"]) {
			expect(report, `an Idea should not carry ${value}`).not.toContain(value);
		}
	});

	it("never attaches a crash, even if one is sitting in the draft", () => {
		const draft: FeedbackDraft = { ...idea(), crash: { detail: "TypeError: boom", stack: "at Foo (file.js:1:1)" } };
		expect(composeReport(draft, CONTEXT)).not.toContain("### Crash");
	});
});

describe("composeReport, with a crash", () => {
	const crashed = bug({}, { crash: { detail: "TypeError: boom", stack: "at Foo (file.js:1:1)" } });

	it("fences the frames and keeps the detail above them", () => {
		const report = composeReport(crashed, CONTEXT);
		expect(report).toContain("### Crash");
		expect(report).toContain("TypeError: boom");
		expect(report).toContain("```\nat Foo (file.js:1:1)\n```");
	});

	it("says the reporter removed the error text rather than leaving a blank", () => {
		const draft: FeedbackDraft = { ...crashed, crash: { detail: "  ", stack: "at Foo (file.js:1:1)" } };
		expect(composeReport(draft, CONTEXT)).toContain("_The reporter removed the error text._");
	});
});

describe("composeTitle", () => {
	it("prefixes by kind", () => {
		expect(composeTitle(bug())).toBe("[Bug] Opening Record Columns");
		expect(composeTitle(idea())).toBe("[Idea] Compare two environments");
	});

	it("takes the first line only", () => {
		expect(composeTitle(bug({ doing: "First line\nSecond line" }))).toBe("[Bug] First line");
	});

	it("trims a long lead", () => {
		const title = composeTitle(bug({ doing: "x".repeat(200) }));
		expect(title.length).toBeLessThanOrEqual("[Bug] ".length + 70);
		expect(title.endsWith("…")).toBe(true);
	});

	it("is still a usable title with nothing typed", () => {
		expect(composeTitle(EMPTY_FEEDBACK_DRAFT)).toBe("[Bug]");
	});
});

describe("buildIssueUrl", () => {
	it("prefills the title and body on the repo's new-issue route", () => {
		const { url, withinLimit } = buildIssueUrl("[Bug] Something", "A body");
		expect(url.startsWith("https://github.com/ecurrier/DynamicsExtension/issues/new?")).toBe(true);
		expect(url).toContain("title=%5BBug%5D+Something");
		expect(url).toContain("body=A+body");
		expect(withinLimit).toBe(true);
	});

	it("names no template, so a prefilled body cannot lose to one", () => {
		expect(buildIssueUrl("t", "b").url).not.toContain("template=");
	});

	it("flags a report too long to prefill, instead of truncating it", () => {
		const { url, withinLimit } = buildIssueUrl("[Bug] Long", "x".repeat(REPORT_LIMIT + 1));
		expect(withinLimit).toBe(false);
		// The URL is still built: the Area decides what to do, this does not decide for it.
		expect(url).toContain("issues/new?");
	});

	it("flags a body that only blows the limit once it is encoded", () => {
		// Well under the character limit, but every newline triples when encoded.
		expect(buildIssueUrl("[Bug] Newlines", "\n".repeat(3000)).withinLimit).toBe(false);
	});
});
