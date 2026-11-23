import { countExcluded, type FetchXmlDocument, serializeFetchXml, toCSharpString, toJavaScriptString } from "@/shared/lib/fetchxml";

export type CopyForm = "query" | "minified" | "javascript" | "csharp" | "asWritten";

export const COPY_MENU_FORMS: readonly CopyForm[] = ["minified", "javascript", "csharp", "asWritten"];

export const COPY_FORM_LABELS: Readonly<Record<CopyForm, string>> = {
	query: "Copy",
	minified: "Copy minified",
	javascript: "Copy as a JavaScript string",
	csharp: "Copy as a C# string",
	asWritten: "Copy with Excluded rows",
};

export interface CopySource {
	readonly text: string;
	readonly document: FetchXmlDocument | null;
}

export interface CopyState {
	readonly hasText: boolean;
	readonly parses: boolean;
}

export type CopyOutcome = { readonly ok: true; readonly text: string; readonly message: string } | { readonly ok: false; readonly reason: string };

export const NOTHING_TO_COPY = "There is no Query to copy.";

export const DOES_NOT_PARSE = "The Fetch XML does not parse.";

export const copyBlockedReason = (form: CopyForm, { hasText, parses }: CopyState): string | null => {
	if (!hasText) {
		return NOTHING_TO_COPY;
	}
	if (parses || form === "query" || form === "asWritten") {
		return null;
	}
	return DOES_NOT_PARSE;
};

const leftOut = (count: number): string => {
	if (count === 0) {
		return "";
	}
	return count === 1 ? " 1 Excluded row left out." : ` ${count} Excluded rows left out.`;
};

const included = (count: number): string => {
	if (count === 0) {
		return "";
	}
	return count === 1 ? " It has 1 Excluded row." : ` It has ${count} Excluded rows.`;
};

const parsedForm = (form: Exclude<CopyForm, "asWritten">, document: FetchXmlDocument): CopyOutcome => {
	const suffix = leftOut(countExcluded(document));
	switch (form) {
		case "query":
			return { ok: true, text: serializeFetchXml(document, { omitExcluded: true }), message: `Copied.${suffix}` };
		case "minified":
			return { ok: true, text: serializeFetchXml(document, { minify: true, omitExcluded: true }), message: `Copied the minified Query.${suffix}` };
		case "javascript":
			return { ok: true, text: toJavaScriptString(document, { omitExcluded: true }), message: `Copied the Query as a JavaScript string.${suffix}` };
		case "csharp":
			return { ok: true, text: toCSharpString(document, { omitExcluded: true }), message: `Copied the Query as a C# string.${suffix}` };
	}
};

export const copyQuery = (form: CopyForm, { text, document }: CopySource): CopyOutcome => {
	const reason = copyBlockedReason(form, { hasText: text.trim() !== "", parses: document !== null });
	if (reason !== null) {
		return { ok: false, reason };
	}
	if (form === "asWritten") {
		return { ok: true, text, message: `Copied the text as written.${document ? included(countExcluded(document)) : ""}` };
	}
	if (document === null) {
		return { ok: true, text, message: `Copied the text as written. ${DOES_NOT_PARSE}` };
	}
	return parsedForm(form, document);
};
