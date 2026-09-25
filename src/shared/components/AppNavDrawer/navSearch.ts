import { type FluentIcon } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

export interface HighlightSegment {
	text: string;
	match: boolean;
}

export interface NavSearchHit {
	key: string;
	index: number;
	areaId: string;
	utilityId: string | null;
	moduleId: string;
	label: HighlightSegment[];
	description: HighlightSegment[];
	context: string | null;
	keyword: string | null;
}

export interface NavSearchGroup {
	moduleId: string;
	label: string;
	icon: FluentIcon;
	hits: NavSearchHit[];
}

export interface NavSearchResults {
	groups: NavSearchGroup[];
	hits: NavSearchHit[];
	total: number;
}

interface SearchEntry {
	key: string;
	areaId: string;
	utilityId: string | null;
	module: ModuleDefinition;
	label: string;
	description: string;
	keywords: string[];
	context: string | null;
	matchesModule: boolean;
	order: number;
}

interface ScoredEntry {
	entry: SearchEntry;
	score: number;
	keyword: string | null;
}

interface Range {
	start: number;
	end: number;
}

const LABEL_PREFIX = 100;
const LABEL_WORD = 80;
const LABEL_ANYWHERE = 60;
const MODULE_WORD = 50;
const KEYWORD_WORD = 40;
const DESCRIPTION_WORD = 20;
const UTILITY_PENALTY = 5;
const MIN_RELATIVE_SCORE = 0.2;
const DESCRIPTION_LEAD = 28;
const DESCRIPTION_CONTEXT = 12;

export const NAV_SEARCH_LIMIT = 12;

export const EMPTY_NAV_SEARCH: NavSearchResults = { groups: [], hits: [], total: 0 };

const isWordCharacter = (character: string | undefined): boolean => character !== undefined && /[\p{L}\p{N}]/u.test(character);

const wordStarts = (text: string, token: string): number[] => {
	if (token === "") {
		return [];
	}
	const positions: number[] = [];
	let position = text.indexOf(token);
	while (position >= 0) {
		if (!isWordCharacter(text[position - 1])) {
			positions.push(position);
		}
		position = text.indexOf(token, position + 1);
	}
	return positions;
};

const withoutHyphens = (value: string): string => value.replace(/-/g, "");

const startsWord = (text: string, token: string): boolean =>
	wordStarts(text, token).length > 0 || wordStarts(withoutHyphens(text), withoutHyphens(token)).length > 0;

const labelScore = (label: string, token: string): number => {
	const bare = withoutHyphens(token);
	const flat = withoutHyphens(label);
	if (label.startsWith(token) || (bare !== "" && flat.startsWith(bare))) {
		return LABEL_PREFIX;
	}
	if (startsWord(label, token)) {
		return LABEL_WORD;
	}
	return label.includes(token) || (bare !== "" && flat.includes(bare)) ? LABEL_ANYWHERE : 0;
};

export const searchTokens = (query: string): string[] => query.toLowerCase().split(/\s+/).filter(Boolean);

const entriesFor = (modules: ModuleDefinition[]): SearchEntry[] =>
	modules.flatMap((module, moduleIndex) =>
		module.areas.flatMap((area, areaIndex) => {
			const order = moduleIndex * 1000 + areaIndex * 100;
			const areaEntry: SearchEntry = {
				key: area.id,
				areaId: area.id,
				utilityId: null,
				module,
				label: area.label,
				description: area.tooltip ?? "",
				keywords: area.keywords ?? [],
				context: null,
				matchesModule: true,
				order,
			};
			const utilityEntries = (area.utilities ?? []).map((utility, utilityIndex): SearchEntry => ({
				key: `${area.id}/${utility.id}`,
				areaId: area.id,
				utilityId: utility.id,
				module,
				label: utility.title,
				description: utility.description,
				keywords: utility.keywords ?? [],
				context: `${area.label} utility`,
				matchesModule: false,
				order: order + utilityIndex + 1,
			}));
			return [areaEntry, ...utilityEntries];
		})
	);

const scoreEntry = (entry: SearchEntry, tokens: string[]): ScoredEntry | null => {
	const label = entry.label.toLowerCase();
	const description = entry.description.toLowerCase();
	const moduleLabel = entry.module.label.toLowerCase();
	const keywords = entry.keywords.map((keyword) => keyword.toLowerCase());
	let score = 0;
	let keyword: string | null = null;
	for (const token of tokens) {
		const fromLabel = labelScore(label, token);
		const fromModule = entry.matchesModule && startsWord(moduleLabel, token) ? MODULE_WORD : 0;
		const fromDescription = wordStarts(description, token).length > 0 ? DESCRIPTION_WORD : 0;
		const matchedKeyword = keywords.find((candidate) => startsWord(candidate, token)) ?? null;
		const best = Math.max(fromLabel, fromModule, matchedKeyword ? KEYWORD_WORD : 0, fromDescription);
		if (best === 0) {
			return null;
		}
		if (matchedKeyword && keyword === null && fromLabel === 0 && fromModule === 0 && fromDescription === 0) {
			keyword = matchedKeyword;
		}
		score += best;
	}
	return { entry, score: entry.utilityId ? score - UTILITY_PENALTY : score, keyword };
};

const mergeRanges = (ranges: Range[]): Range[] => {
	const merged: Range[] = [];
	for (const range of [...ranges].sort((left, right) => left.start - right.start)) {
		const last = merged[merged.length - 1];
		if (last && range.start <= last.end) {
			last.end = Math.max(last.end, range.end);
		} else {
			merged.push({ ...range });
		}
	}
	return merged;
};

export const toSegments = (text: string, ranges: Range[]): HighlightSegment[] => {
	const segments: HighlightSegment[] = [];
	let index = 0;
	for (const range of mergeRanges(ranges)) {
		if (range.start > index) {
			segments.push({ text: text.slice(index, range.start), match: false });
		}
		segments.push({ text: text.slice(range.start, range.end), match: true });
		index = range.end;
	}
	if (index < text.length) {
		segments.push({ text: text.slice(index), match: false });
	}
	return segments;
};

const excerpt = (text: string, ranges: Range[]): { text: string; ranges: Range[] } => {
	const first = Math.min(...ranges.map((range) => range.start));
	if (!Number.isFinite(first) || first <= DESCRIPTION_LEAD) {
		return { text, ranges };
	}
	const space = text.lastIndexOf(" ", first - DESCRIPTION_CONTEXT);
	const from = space >= 0 ? space + 1 : first;
	return {
		text: `…${text.slice(from)}`,
		ranges: ranges.map((range) => ({ start: range.start - from + 1, end: range.end - from + 1 })),
	};
};

const labelRanges = (label: string, tokens: string[]): Range[] =>
	tokens.flatMap((token) => {
		const start = wordStarts(label, token)[0] ?? label.indexOf(token);
		return start >= 0 ? [{ start, end: start + token.length }] : [];
	});

const descriptionRanges = (description: string, tokens: string[]): Range[] =>
	tokens.flatMap((token) => {
		const start = wordStarts(description, token)[0];
		return start === undefined ? [] : [{ start, end: start + token.length }];
	});

const toHit = ({ entry, keyword }: ScoredEntry, tokens: string[], index: number): NavSearchHit => {
	const inLabel = labelRanges(entry.label.toLowerCase(), tokens);
	const inDescription = descriptionRanges(entry.description.toLowerCase(), tokens);
	const shown = inLabel.length === tokens.length ? { text: entry.description, ranges: inDescription } : excerpt(entry.description, inDescription);
	return {
		key: entry.key,
		index,
		areaId: entry.areaId,
		utilityId: entry.utilityId,
		moduleId: entry.module.id,
		label: toSegments(entry.label, inLabel),
		description: toSegments(shown.text, shown.ranges),
		context: entry.context,
		keyword,
	};
};

export const searchNav = (modules: ModuleDefinition[], query: string, limit = NAV_SEARCH_LIMIT): NavSearchResults => {
	const tokens = searchTokens(query);
	if (tokens.length === 0) {
		return EMPTY_NAV_SEARCH;
	}
	const matched = entriesFor(modules)
		.map((entry) => scoreEntry(entry, tokens))
		.filter((result): result is ScoredEntry => result !== null)
		.sort((left, right) => right.score - left.score || left.entry.order - right.entry.order);
	const floor = (matched[0]?.score ?? 0) * MIN_RELATIVE_SCORE;
	const scored = matched.filter((result) => result.score >= floor);
	const grouped: { module: ModuleDefinition; results: ScoredEntry[] }[] = [];
	for (const result of scored.slice(0, limit)) {
		const group = grouped.find((candidate) => candidate.module.id === result.entry.module.id);
		if (group) {
			group.results.push(result);
		} else {
			grouped.push({ module: result.entry.module, results: [result] });
		}
	}
	let index = 0;
	const groups = grouped.map(({ module, results }) => ({
		moduleId: module.id,
		label: module.label,
		icon: module.icon,
		hits: results.map((result) => toHit(result, tokens, index++)),
	}));
	return { groups, hits: groups.flatMap((group) => group.hits), total: scored.length };
};
