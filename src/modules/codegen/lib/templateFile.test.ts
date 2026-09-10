import { describe, expect, it } from "vitest";

import { type Template } from "@/shared/types";

import { parseTemplateFile, serializeTemplateFile, TEMPLATE_FILE_KIND, TEMPLATE_FILE_VERSION, templateExportFileName } from "./templateFile";

const template: Template = {
	id: "stored-id",
	name: "Account class",
	kind: "table",
	language: "csharp",
	text: "public class {{table.identifier}} {}",
	settings: [{ key: "namespace", label: "Namespace", default: "Contoso" }],
	filenamePattern: "{{table.identifier}}.cs",
	builtIn: true,
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const body = {
	name: template.name,
	kind: template.kind,
	language: template.language,
	text: template.text,
	settings: template.settings,
	filenamePattern: template.filenamePattern,
};

const options = { newId: () => "new-id", now: () => "2026-09-07T00:00:00.000Z" };

const fileWith = (overrides: Record<string, unknown>): string =>
	JSON.stringify({ kind: TEMPLATE_FILE_KIND, version: TEMPLATE_FILE_VERSION, template: { ...body, ...overrides } });

const fileWithout = (key: string): string => {
	const rest: Record<string, unknown> = { ...body };
	delete rest[key];
	return JSON.stringify({ kind: TEMPLATE_FILE_KIND, version: TEMPLATE_FILE_VERSION, template: rest });
};

describe("serializeTemplateFile", () => {
	it("writes the file envelope without id, builtIn, or updatedAt", () => {
		expect(JSON.parse(serializeTemplateFile(template))).toEqual({
			kind: "power-tools-template",
			version: 1,
			template: body,
		});
	});

	it("pretty prints", () => {
		expect(serializeTemplateFile(template)).toContain('\n  "kind": "power-tools-template"');
	});
});

describe("parseTemplateFile", () => {
	it("round-trips a serialized template with a fresh id and timestamp", () => {
		expect(parseTemplateFile(serializeTemplateFile(template), options)).toEqual({
			...template,
			id: "new-id",
			builtIn: false,
			updatedAt: "2026-09-07T00:00:00.000Z",
		});
	});

	it("takes id, builtIn, and updatedAt from options rather than the file", () => {
		const parsed = parseTemplateFile(fileWith({ id: "file-id", builtIn: true, updatedAt: "1999-01-01T00:00:00.000Z" }), options);
		expect(parsed.id).toBe("new-id");
		expect(parsed.builtIn).toBe(false);
		expect(parsed.updatedAt).toBe("2026-09-07T00:00:00.000Z");
	});

	it("defaults missing settings to an empty list", () => {
		expect(parseTemplateFile(fileWithout("settings"), options).settings).toEqual([]);
	});

	it("defaults a missing filename pattern to an empty string", () => {
		expect(parseTemplateFile(fileWithout("filenamePattern"), options).filenamePattern).toBe("");
	});

	it("rejects non-object content", () => {
		expect(() => parseTemplateFile("[1]", options)).toThrow("The file does not contain a template object");
		expect(() => parseTemplateFile('"x"', options)).toThrow("The file does not contain a template object");
	});

	it("rejects files of another kind", () => {
		expect(() => parseTemplateFile(JSON.stringify({ kind: "other", template: body }), options)).toThrow("The file is not a power-tools-template file");
		expect(() => parseTemplateFile(JSON.stringify({ template: body }), options)).toThrow("The file is not a power-tools-template file");
	});

	it("rejects a missing template object", () => {
		expect(() => parseTemplateFile(JSON.stringify({ kind: TEMPLATE_FILE_KIND }), options)).toThrow("The file has no template");
		expect(() => parseTemplateFile(JSON.stringify({ kind: TEMPLATE_FILE_KIND, template: [] }), options)).toThrow("The file has no template");
	});

	it("rejects a missing, empty, or non-string name", () => {
		expect(() => parseTemplateFile(fileWithout("name"), options)).toThrow("Template name must be a non-empty string");
		expect(() => parseTemplateFile(fileWith({ name: "" }), options)).toThrow("Template name must be a non-empty string");
		expect(() => parseTemplateFile(fileWith({ name: "   " }), options)).toThrow("Template name must be a non-empty string");
		expect(() => parseTemplateFile(fileWith({ name: 1 }), options)).toThrow("Template name must be a non-empty string");
	});

	it("rejects an unknown kind", () => {
		expect(() => parseTemplateFile(fileWith({ kind: "form" }), options)).toThrow("Template kind must be one of table, choice");
		expect(() => parseTemplateFile(fileWithout("kind"), options)).toThrow("Template kind must be one of table, choice");
	});

	it("rejects an unknown language", () => {
		expect(() => parseTemplateFile(fileWith({ language: "python" }), options)).toThrow("Template language must be one of csharp, typescript, javascript");
		expect(() => parseTemplateFile(fileWith({ language: "C#" }), options)).toThrow("Template language must be one of csharp, typescript, javascript");
	});

	it("rejects non-string text", () => {
		expect(() => parseTemplateFile(fileWithout("text"), options)).toThrow("Template text must be a string");
		expect(() => parseTemplateFile(fileWith({ text: ["a"] }), options)).toThrow("Template text must be a string");
	});

	it("rejects settings that are not an array", () => {
		expect(() => parseTemplateFile(fileWith({ settings: {} }), options)).toThrow("Template settings must be an array");
		expect(() => parseTemplateFile(fileWith({ settings: null }), options)).toThrow("Template settings must be an array");
	});

	it("rejects malformed setting entries", () => {
		const message = "Template setting 2 must have a string key, label, and default";
		const valid = { key: "a", label: "A", default: "" };
		expect(() => parseTemplateFile(fileWith({ settings: [valid, "x"] }), options)).toThrow(message);
		expect(() => parseTemplateFile(fileWith({ settings: [valid, { key: "b", label: "B" }] }), options)).toThrow(message);
		expect(() => parseTemplateFile(fileWith({ settings: [valid, { key: "b", label: "B", default: 1 }] }), options)).toThrow(message);
		expect(() => parseTemplateFile(fileWith({ settings: [valid, { label: "B", default: "" }] }), options)).toThrow(message);
	});

	it("keeps only key, label, and default from setting entries", () => {
		const parsed = parseTemplateFile(fileWith({ settings: [{ key: "a", label: "A", default: "x", extra: true }] }), options);
		expect(parsed.settings).toEqual([{ key: "a", label: "A", default: "x" }]);
	});

	it("rejects a non-string filename pattern", () => {
		expect(() => parseTemplateFile(fileWith({ filenamePattern: null }), options)).toThrow("Template filename pattern must be a string");
		expect(() => parseTemplateFile(fileWith({ filenamePattern: 3 }), options)).toThrow("Template filename pattern must be a string");
	});
});

describe("templateExportFileName", () => {
	it("uses the trimmed name", () => {
		expect(templateExportFileName("  Account class ")).toBe("Template - Account class.json");
	});

	it("falls back to Untitled", () => {
		expect(templateExportFileName("")).toBe("Template - Untitled.json");
		expect(templateExportFileName("   ")).toBe("Template - Untitled.json");
	});
});
