import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import { type EntityInfo, type LookupSelection, type LookupTarget, type RecordSearchResult } from "@/shared/types";

export interface RecordLookupServices {
	search: (entityLogicalName: string, query: string) => Promise<RecordSearchResult[]>;
	getEntityInfo: (entityLogicalName: string) => Promise<EntityInfo>;
}

export interface UseRecordSearchOptions extends RecordLookupServices {
	targets: LookupTarget[];
	value: LookupSelection | null;
	onChange: (value: LookupSelection | null) => void;
}

interface SearchState {
	key: string;
	rows: RecordSearchResult[];
	error: string | null;
}

const DEBOUNCE_MS = 300;

const NO_ROWS: RecordSearchResult[] = [];

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const searchKey = (target: string, query: string): string => `${target}|${query}`;

export const useRecordSearch = ({ targets, value, onChange, search, getEntityInfo }: UseRecordSearchOptions) => {
	const [draftText, setDraftText] = useState("");
	const [open, setOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(-1);
	const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
	const [entityInfos, setEntityInfos] = useState<Record<string, EntityInfo>>({});
	const [searchState, setSearchState] = useState<SearchState | null>(null);
	const sequence = useRef(0);
	const requestedInfos = useRef(new Set<string>());

	const searchText = value ? value.name : draftText;
	const query = value ? "" : draftText.trim();
	const fallbackTarget = value?.entityLogicalName ?? targets[0]?.logicalName ?? "";
	const activeTarget = selectedTarget && targets.some((target) => target.logicalName === selectedTarget) ? selectedTarget : fallbackTarget;
	const key = searchKey(activeTarget, query);
	const settled = searchState?.key === key ? searchState : null;
	const results = settled?.rows ?? NO_ROWS;
	const error = settled?.error ?? null;
	const loading = open && activeTarget !== "" && settled === null;
	const focused = results.length === 0 ? -1 : Math.min(focusedIndex, results.length - 1);

	useEffect(() => {
		if (!open) {
			return;
		}
		for (const target of targets) {
			if (requestedInfos.current.has(target.logicalName)) {
				continue;
			}
			requestedInfos.current.add(target.logicalName);
			getEntityInfo(target.logicalName)
				.then((info) => setEntityInfos((current) => ({ ...current, [target.logicalName]: info })))
				.catch(() => requestedInfos.current.delete(target.logicalName));
		}
	}, [open, targets, getEntityInfo]);

	useEffect(() => {
		if (!open || !activeTarget || settled) {
			return;
		}
		const current = ++sequence.current;
		const timer = setTimeout(
			() => {
				search(activeTarget, query)
					.then((rows) => {
						if (current === sequence.current) {
							setSearchState({ key, rows, error: null });
						}
					})
					.catch((cause: unknown) => {
						if (current === sequence.current) {
							setSearchState({ key, rows: [], error: describeError(cause) });
						}
					});
			},
			query ? DEBOUNCE_MS : 0
		);
		return () => clearTimeout(timer);
	}, [open, activeTarget, query, key, settled, search]);

	const openPanel = useCallback(() => setOpen(true), []);

	const closePanel = useCallback(() => {
		setOpen(false);
		setFocusedIndex(-1);
	}, []);

	const selectTarget = useCallback((target: string) => {
		setSelectedTarget(target);
		setFocusedIndex(-1);
	}, []);

	const handleInputChange = useCallback(
		(text: string) => {
			setDraftText(text);
			setFocusedIndex(-1);
			setOpen(true);
			if (value) {
				onChange(null);
			}
		},
		[value, onChange]
	);

	const clear = useCallback(() => {
		setDraftText("");
		setFocusedIndex(-1);
		setOpen(true);
		if (value) {
			onChange(null);
		}
	}, [value, onChange]);

	const select = useCallback(
		async (result: RecordSearchResult) => {
			const target = targets.find((candidate) => candidate.logicalName === activeTarget);
			if (!target) {
				return;
			}
			try {
				const info = entityInfos[target.logicalName] ?? (await getEntityInfo(target.logicalName));
				onChange({
					id: result.id,
					name: result.name || result.id,
					entityLogicalName: target.logicalName,
					entitySetName: info.entitySetName,
					navigationProperty: target.navigationProperty,
				});
				setDraftText("");
				setOpen(false);
				setFocusedIndex(-1);
			} catch (cause) {
				setSearchState({ key, rows: results, error: describeError(cause) });
			}
		},
		[targets, activeTarget, entityInfos, getEntityInfo, onChange, key, results]
	);

	const focusRow = useCallback((index: number) => setFocusedIndex(index), []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			switch (event.key) {
				case "ArrowDown":
					event.preventDefault();
					if (!open) {
						setOpen(true);
					} else if (results.length > 0) {
						setFocusedIndex(Math.min(focused + 1, results.length - 1));
					}
					break;
				case "ArrowUp":
					if (open) {
						event.preventDefault();
						setFocusedIndex(Math.max(focused - 1, 0));
					}
					break;
				case "Enter": {
					const row = open && focused >= 0 ? results[focused] : undefined;
					if (row) {
						event.preventDefault();
						void select(row);
					}
					break;
				}
				case "Escape":
					if (open) {
						event.preventDefault();
						event.stopPropagation();
						closePanel();
					}
					break;
			}
		},
		[open, results, focused, select, closePanel]
	);

	return {
		searchText,
		query,
		open,
		loading,
		error,
		results,
		focusedIndex: focused,
		activeTarget,
		entityInfos,
		openPanel,
		closePanel,
		selectTarget,
		handleInputChange,
		handleKeyDown,
		select,
		clear,
		focusRow,
	};
};

export type UseRecordSearchReturn = ReturnType<typeof useRecordSearch>;
