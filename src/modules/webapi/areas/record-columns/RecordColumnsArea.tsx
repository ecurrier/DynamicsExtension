import { Button, makeStyles, MessageBar, MessageBarActions, MessageBarBody, Select, Spinner, Text, ToggleButton, tokens } from "@fluentui/react-components";
import { ArrowClockwise20Regular, Dismiss16Regular } from "@fluentui/react-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePageFetcher, usePageMutation, usePageQuery } from "@/messaging/client";
import { AreaContainer, EmptyState, type RecordLookupServices, TableFilter, useAppToast, useConfirm, useTableFilter } from "@/shared/components";

import { ColumnRow } from "./ColumnRow";
import { type ReviewEntry, SaveBar } from "./SaveBar";
import {
	applyDraft,
	buildRecordColumns,
	buildSavePayload,
	checkDraft,
	describeDraft,
	type DraftCheck,
	type Drafts,
	type DraftValue,
	isRequiredCleared,
	loadedDraft,
	matchesRecordColumnFilters,
	reconcileDrafts,
	type RecordColumn,
	type RecordColumnFilter,
	recordColumnSearchFields,
	type RecordColumnSort,
	removeDraft,
	sortRecordColumns,
} from "../../lib";

const SEARCH_TOP = 25;

const FILTERS: { id: RecordColumnFilter; label: string }[] = [
	{ id: "changed", label: "Changed" },
	{ id: "hasValue", label: "Has value" },
	{ id: "notOnForm", label: "Not on form" },
	{ id: "editable", label: "Editable" },
	{ id: "custom", label: "Custom only" },
];

const useStyles = makeStyles({
	controls: {
		display: "flex",
		flexDirection: "column",
		gap: "8px",
		flexShrink: 0,
	},
	searchRow: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		gap: "8px",
	},
	search: {
		flex: "1 1 220px",
		minWidth: 0,
	},
	chips: {
		display: "flex",
		flexWrap: "wrap",
		gap: "6px",
	},
	list: {
		flex: 1,
		minHeight: 0,
		overflowY: "auto",
		containerType: "inline-size",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	caption: {
		color: tokens.colorNeutralForeground3,
	},
	noMatch: {
		padding: "16px",
		color: tokens.colorNeutralForeground3,
	},
});

interface DraftState {
	recordId: string | null;
	drafts: Drafts;
}

const EMPTY_DRAFTS: DraftState = { recordId: null, drafts: {} };

const focusRow = (element: HTMLElement) => {
	element.scrollIntoView({ block: "center" });
	element.querySelector<HTMLElement>("input, textarea, select, button")?.focus({ preventScroll: true });
};

export const RecordColumnsArea = () => {
	const styles = useStyles();
	const toast = useAppToast();
	const confirm = useConfirm();
	const fetchPage = usePageFetcher();
	const snapshot = usePageQuery("webapi.getRecordValues", undefined);
	const entityName = snapshot.data?.entityName ?? "";
	const recordId = snapshot.data?.recordId ?? null;
	const table = usePageQuery("codegen.getTableModel", { entityLogicalName: entityName }, { enabled: entityName !== "" });
	const formAttributes = usePageQuery("utilities.getFormAttributes", undefined);
	const [draftState, setDraftState] = useState<DraftState>(EMPTY_DRAFTS);
	const [filters, setFilters] = useState<ReadonlySet<RecordColumnFilter>>(new Set());
	const [sort, setSort] = useState<RecordColumnSort>("displayName");
	const [reviewOpen, setReviewOpen] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const rowElements = useRef(new Map<string, HTMLDivElement>());
	const pendingFocus = useRef<string | null>(null);

	const lookupServices = useMemo<RecordLookupServices>(
		() => ({
			search: (entityLogicalName, query) => fetchPage("webapi.searchRecords", { entityLogicalName, query, top: SEARCH_TOP }, { fresh: query === "" }),
			getEntityInfo: (logicalName) => fetchPage("webapi.getEntityInfo", { logicalName }),
		}),
		[fetchPage]
	);

	const formSet = useMemo(
		() =>
			formAttributes.data
				? new Set(formAttributes.data.filter((attribute) => attribute.controls.length > 0).map((attribute) => attribute.logicalName))
				: null,
		[formAttributes.data]
	);

	const rows = useMemo(
		() => (table.data && snapshot.data ? sortRecordColumns(buildRecordColumns(table.data, snapshot.data.values, formSet), sort) : []),
		[table.data, snapshot.data, formSet, sort]
	);

	const [prunedFor, setPrunedFor] = useState(rows);
	if (prunedFor !== rows && rows.length > 0) {
		setPrunedFor(rows);
		if (draftState.recordId === recordId) {
			const pruned = reconcileDrafts(draftState.drafts, rows);
			if (Object.keys(pruned).length !== Object.keys(draftState.drafts).length) {
				setDraftState({ recordId, drafts: pruned });
			}
		}
	}

	const sameRecord = draftState.recordId === recordId;
	const drafts = useMemo(() => (sameRecord ? reconcileDrafts(draftState.drafts, rows) : {}), [sameRecord, draftState.drafts, rows]);
	const droppedCount = !sameRecord && recordId !== null ? Object.keys(draftState.drafts).length : 0;
	const changedNames = useMemo(() => new Set(Object.keys(drafts)), [drafts]);

	const checks = useMemo(() => {
		const result = new Map<string, DraftCheck>();
		for (const row of rows) {
			const draft = drafts[row.logicalName];
			if (draft) {
				result.set(row.logicalName, checkDraft(row, draft));
			}
		}
		return result;
	}, [rows, drafts]);

	const filter = useTableFilter(rows, recordColumnSearchFields);
	const visible = useMemo(
		() => (filters.size === 0 ? filter.filtered : filter.filtered.filter((row) => matchesRecordColumnFilters(row, filters, changedNames))),
		[filter.filtered, filters, changedNames]
	);

	const entries = useMemo<ReviewEntry[]>(
		() =>
			rows.flatMap((row) => {
				const draft = drafts[row.logicalName];
				return draft
					? [
							{
								logicalName: row.logicalName,
								displayName: row.displayName,
								oldValue: row.displayValue,
								newValue: describeDraft(row, draft),
								invalid: checks.get(row.logicalName)?.ok === false,
							},
						]
					: [];
			}),
		[rows, drafts, checks]
	);
	const invalidNames = entries.filter((entry) => entry.invalid).map((entry) => entry.logicalName);
	const loadedValues = useMemo(() => new Map(rows.map((row) => [row.logicalName, loadedDraft(row)])), [rows]);
	const requiredNames = useMemo(
		() =>
			new Set(
				rows.flatMap((row) => {
					const draft = drafts[row.logicalName];
					return draft !== undefined && isRequiredCleared(row, draft) ? [row.logicalName] : [];
				})
			),
		[rows, drafts]
	);

	const { refetch: refetchSnapshot } = snapshot;
	useEffect(() => {
		const onFocus = () => void refetchSnapshot();
		window.addEventListener("focus", onFocus);
		return () => window.removeEventListener("focus", onFocus);
	}, [refetchSnapshot]);

	useEffect(() => {
		const name = pendingFocus.current;
		const element = name ? rowElements.current.get(name) : undefined;
		if (element) {
			pendingFocus.current = null;
			focusRow(element);
		}
	});

	const register = useCallback((logicalName: string, element: HTMLDivElement | null) => {
		if (element) {
			rowElements.current.set(logicalName, element);
		} else {
			rowElements.current.delete(logicalName);
		}
	}, []);

	const onChange = useCallback(
		(row: RecordColumn, value: DraftValue) =>
			setDraftState((previous) => ({
				recordId,
				drafts: applyDraft(previous.recordId === recordId ? reconcileDrafts(previous.drafts, rows) : {}, row, value),
			})),
		[recordId, rows]
	);

	const onUndo = useCallback(
		(logicalName: string) =>
			setDraftState((previous) => ({ recordId, drafts: previous.recordId === recordId ? removeDraft(previous.drafts, logicalName) : {} })),
		[recordId]
	);

	const jumpTo = (logicalName: string) => {
		const element = rowElements.current.get(logicalName);
		if (element) {
			focusRow(element);
			return;
		}
		pendingFocus.current = logicalName;
		filter.setQuery("");
		setFilters(new Set());
	};

	const toggleFilter = (id: RecordColumnFilter) =>
		setFilters((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});

	const refreshForm = usePageMutation("webapi.refreshForm", { silent: true, onError: (error) => toast.error("Could not refresh the form", error) });
	const save = usePageMutation("webapi.saveRecord", { silent: true });

	const refreshAfterSave = async () => {
		const state = await fetchPage("webapi.getFormState", undefined, { fresh: true }).catch(() => null);
		if (state?.isDirty) {
			const refresh = await confirm({
				title: "The form has unsaved changes",
				content:
					"The columns were saved. Refreshing the form shows the new values but discards the changes made on the form that have not been saved yet.",
				confirmLabel: "Refresh form",
				cancelLabel: "Leave form as is",
			});
			if (!refresh) {
				return;
			}
		}
		refreshForm.mutate(undefined);
	};

	const onSave = async () => {
		const result = buildSavePayload(rows, drafts);
		const firstInvalid = result.invalid[0];
		if (firstInvalid) {
			jumpTo(firstInvalid.logicalName);
			return;
		}
		setSaveError(null);
		try {
			await save.mutateAsync({ payload: result.payload });
		} catch (error) {
			setSaveError(error instanceof Error ? error.message : String(error));
			return;
		}
		toast.success(result.count === 1 ? "Saved 1 column" : `Saved ${result.count} columns`);
		setDraftState({ recordId, drafts: {} });
		setReviewOpen(false);
		await snapshot.refetch();
		await refreshAfterSave();
	};

	const onDiscard = async () => {
		const discard =
			entries.length === 1 ||
			(await confirm({
				title: "Discard all changes?",
				content: `The ${entries.length} unsaved changes will be lost.`,
				confirmLabel: "Discard all",
			}));
		if (discard) {
			setDraftState({ recordId, drafts: {} });
			setSaveError(null);
			setReviewOpen(false);
		}
	};

	const reload = () => {
		void snapshot.refetch();
		void table.refetch();
		void formAttributes.refetch();
	};

	const loading = snapshot.isPending || (entityName !== "" && table.isPending);
	const error = snapshot.error ?? table.error;
	const fetching = snapshot.isFetching || table.isFetching || formAttributes.isFetching;

	if (snapshot.data && recordId === null) {
		return (
			<AreaContainer>
				<EmptyState title="Save the record first">
					Record Columns works on a saved record. Save this new record, then open Record Columns again.
				</EmptyState>
			</AreaContainer>
		);
	}

	return (
		<AreaContainer fill>
			<div className={styles.controls}>
				<div className={styles.searchRow}>
					<div className={styles.search}>
						<TableFilter
							query={filter.query}
							onChange={filter.setQuery}
							shown={visible.length}
							total={rows.length}
							placeholder="Search columns and values"
						/>
					</div>
					<Select size="small" aria-label="Sort by" value={sort} onChange={(_, data) => setSort(data.value as RecordColumnSort)}>
						<option value="displayName">Display name</option>
						<option value="logicalName">Logical name</option>
					</Select>
					<Button appearance="subtle" size="small" icon={<ArrowClockwise20Regular />} disabled={fetching} onClick={reload}>
						Reload
					</Button>
				</div>
				<div className={styles.chips} role="group" aria-label="Filters">
					{FILTERS.map((item) => (
						<ToggleButton
							key={item.id}
							size="small"
							shape="circular"
							appearance={filters.has(item.id) ? "primary" : "secondary"}
							checked={filters.has(item.id)}
							disabled={item.id === "notOnForm" && formSet === null}
							onClick={() => toggleFilter(item.id)}>
							{item.id === "changed" && entries.length > 0 ? `${item.label} (${entries.length})` : item.label}
						</ToggleButton>
					))}
				</div>
			</div>
			{droppedCount > 0 ? (
				<MessageBar intent="info">
					<MessageBarBody>
						{droppedCount === 1 ? "1 unsaved change" : `${droppedCount} unsaved changes`} belonged to the record you were on before and{" "}
						{droppedCount === 1 ? "was" : "were"} dropped.
					</MessageBarBody>
					<MessageBarActions
						containerAction={
							<Button
								appearance="transparent"
								size="small"
								icon={<Dismiss16Regular />}
								aria-label="Dismiss"
								onClick={() => setDraftState({ recordId, drafts: {} })}
							/>
						}
					/>
				</MessageBar>
			) : null}
			{error ? <Text size={200}>{error.message}</Text> : null}
			{loading && !error ? <Spinner size="small" label="Loading columns..." /> : null}
			{!loading && !error ? (
				<div className={styles.list} role="list" aria-label="Columns">
					{visible.length === 0 ? (
						<Text size={200} className={styles.noMatch}>
							No columns match.
						</Text>
					) : null}
					{visible.map((row) => (
						<ColumnRow
							key={row.logicalName}
							row={row}
							value={drafts[row.logicalName] ?? loadedValues.get(row.logicalName) ?? null}
							changed={changedNames.has(row.logicalName)}
							check={checks.get(row.logicalName) ?? null}
							requiredCleared={requiredNames.has(row.logicalName)}
							lookupServices={lookupServices}
							register={register}
							onChange={onChange}
							onUndo={onUndo}
						/>
					))}
				</div>
			) : null}
			{entries.length > 0 ? (
				<SaveBar
					entries={entries}
					invalidCount={invalidNames.length}
					requiredCount={requiredNames.size}
					reviewOpen={reviewOpen}
					saving={save.isPending}
					error={saveError}
					onToggleReview={() => setReviewOpen((open) => !open)}
					onJump={jumpTo}
					onJumpToInvalid={() => {
						const first = invalidNames[0];
						if (first) {
							jumpTo(first);
						}
					}}
					onUndo={onUndo}
					onDiscard={() => void onDiscard()}
					onSave={() => void onSave()}
				/>
			) : null}
			<Text size={100} className={styles.caption}>
				{table.data ? `${table.data.displayName} · ${recordId ?? ""}` : null}
			</Text>
		</AreaContainer>
	);
};
