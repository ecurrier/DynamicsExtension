export interface RenderResult {
	output: string;
	unresolved: string[];
	error: string | null;
}

interface TextNode {
	kind: "text";
	value: string;
}

interface VariableNode {
	kind: "variable";
	name: string;
}

interface SectionNode {
	kind: "section";
	name: string;
	inverted: boolean;
	children: Node[];
}

type Node = TextNode | VariableNode | SectionNode;

type Token =
	| TextNode
	| VariableNode
	| { kind: "sectionOpen"; name: string }
	| { kind: "invertedOpen"; name: string }
	| { kind: "sectionClose"; name: string }
	| { kind: "comment" };

class TemplateError extends Error {}

const tagToken = (content: string): Token => {
	const sigil = content[0];
	if (sigil === "!") {
		return { kind: "comment" };
	}
	const name = (sigil === "#" || sigil === "^" || sigil === "/" ? content.slice(1) : content).trim();
	if (name === "") {
		throw new TemplateError(`Empty tag {{${content}}}`);
	}
	if (sigil === "#") {
		return { kind: "sectionOpen", name };
	}
	if (sigil === "^") {
		return { kind: "invertedOpen", name };
	}
	if (sigil === "/") {
		return { kind: "sectionClose", name };
	}
	return { kind: "variable", name };
};

const tokenize = (text: string): Token[] => {
	const tokens: Token[] = [];
	let position = 0;
	while (position < text.length) {
		const open = text.indexOf("{{", position);
		if (open === -1) {
			tokens.push({ kind: "text", value: text.slice(position) });
			break;
		}
		if (open > position) {
			tokens.push({ kind: "text", value: text.slice(position, open) });
		}
		const close = text.indexOf("}}", open + 2);
		if (close === -1) {
			const lineEnd = text.indexOf("\n", open);
			const fragment = text.slice(open, lineEnd === -1 ? text.length : lineEnd).trimEnd();
			throw new TemplateError(`Unterminated tag ${fragment}: expected }}`);
		}
		tokens.push(tagToken(text.slice(open + 2, close)));
		position = close + 2;
	}
	return tokens;
};

const STANDALONE_KINDS = new Set<Token["kind"]>(["sectionOpen", "invertedOpen", "sectionClose", "comment"]);

const opensLine = (tokens: Token[], index: number): boolean => {
	const previous = tokens[index - 1];
	if (previous === undefined) {
		return true;
	}
	if (previous.kind !== "text") {
		return false;
	}
	return (index === 1 ? /(^|\n)[ \t]*$/ : /\n[ \t]*$/).test(previous.value);
};

const closesLine = (tokens: Token[], index: number): boolean => {
	const next = tokens[index + 1];
	if (next === undefined) {
		return true;
	}
	if (next.kind !== "text") {
		return false;
	}
	return (index === tokens.length - 2 ? /^[ \t]*(\r?\n|$)/ : /^[ \t]*\r?\n/).test(next.value);
};

const stripStandalone = (tokens: Token[]): Token[] => {
	const standalone = tokens.map((token, index) => STANDALONE_KINDS.has(token.kind) && opensLine(tokens, index) && closesLine(tokens, index));
	return tokens.map((token, index): Token => {
		if (token.kind !== "text") {
			return token;
		}
		const trimmedEnd = standalone[index + 1] ? token.value.replace(/[ \t]*$/, "") : token.value;
		return { kind: "text", value: standalone[index - 1] ? trimmedEnd.replace(/^[ \t]*\r?\n/, "") : trimmedEnd };
	});
};

const parse = (tokens: Token[]): Node[] => {
	const root: Node[] = [];
	const open: SectionNode[] = [];
	const current = (): Node[] => open.at(-1)?.children ?? root;
	for (const token of tokens) {
		if (token.kind === "text" || token.kind === "variable") {
			current().push(token);
		} else if (token.kind === "sectionOpen" || token.kind === "invertedOpen") {
			const section: SectionNode = {
				kind: "section",
				name: token.name,
				inverted: token.kind === "invertedOpen",
				children: [],
			};
			current().push(section);
			open.push(section);
		} else if (token.kind === "sectionClose") {
			const section = open.pop();
			if (section === undefined) {
				throw new TemplateError(`Unexpected {{/${token.name}}} without an open section`);
			}
			if (section.name !== token.name) {
				throw new TemplateError(`Expected {{/${section.name}}} but found {{/${token.name}}}`);
			}
		}
	}
	const unclosed = open.at(-1);
	if (unclosed !== undefined) {
		throw new TemplateError(`Section {{${unclosed.inverted ? "^" : "#"}${unclosed.name}}} is never closed`);
	}
	return root;
};

const hasKey = (value: unknown, key: string): value is Record<string, unknown> => typeof value === "object" && value !== null && Object.hasOwn(value, key);

const lookup = (stack: unknown[], path: string): unknown => {
	if (path === ".") {
		return stack.at(-1);
	}
	const [head = "", ...rest] = path.split(".");
	const frame = stack.findLast((entry): entry is Record<string, unknown> => hasKey(entry, head));
	return rest.reduce<unknown>((value, key) => (hasKey(value, key) ? value[key] : undefined), frame?.[head]);
};

const render = (nodes: Node[], stack: unknown[], unresolved: Set<string>): string => nodes.map((node) => renderNode(node, stack, unresolved)).join("");

const renderNode = (node: Node, stack: unknown[], unresolved: Set<string>): string => {
	if (node.kind === "text") {
		return node.value;
	}
	const value = lookup(stack, node.name);
	if (node.kind === "variable") {
		const missing = value === undefined || value === null;
		if (missing) {
			unresolved.add(node.name);
		}
		return missing ? "" : String(value);
	}
	if (value === undefined) {
		unresolved.add(node.name);
	}
	const items: unknown[] = Array.isArray(value) ? value : value ? [value] : [];
	if (node.inverted) {
		return items.length === 0 ? render(node.children, stack, unresolved) : "";
	}
	return items.map((item) => render(node.children, [...stack, item], unresolved)).join("");
};

export const renderTemplate = (text: string, view: unknown): RenderResult => {
	const unresolved = new Set<string>();
	try {
		const output = render(parse(stripStandalone(tokenize(text))), [view], unresolved);
		return { output, unresolved: [...unresolved], error: null };
	} catch (error) {
		if (!(error instanceof TemplateError)) {
			throw error;
		}
		return { output: "", unresolved: [...unresolved], error: error.message };
	}
};
