import { isolateHistory, redo, undo } from "@codemirror/commands";
import { linter, setDiagnostics } from "@codemirror/lint";
import { EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { makeStyles, mergeClasses, Tab, TabList, tokens } from "@fluentui/react-components";
import { PanelRightContract20Regular } from "@fluentui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalChange } from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef, useState } from "react";

import { CodeEditor } from "@/shared/components";
import { rangeOfNode, type TableLookup } from "@/shared/lib/fetchxml";
import { type QueryTable } from "@/shared/types";

import { fetchXmlCompletion, layeredMetadata, lintDiagnostics, updateXmlCompletionServices, xmlPaneTheme } from "./editor";
import { useQueryEditing } from "./editors";
import { PaneHeader } from "./PaneChrome";
import { ParseErrorBanner } from "./ParseErrorBanner";
import { useQueryDiagnostics } from "./QueryDiagnostics";
import { type QueryBuilderState, useQueryBuilder, useQueryBuilderStoreApi, type XmlPaneTab } from "./store";
import { WebApiPane } from "./WebApiPane";
import { XmlCopyButton } from "./XmlCopyButton";

const TREE_SELECT_EVENT = "select.tree";

const revealSelection = (view: EditorView, state: QueryBuilderState) => {
	if (state.selectionOrigin !== "tree" || !state.selectedPath || !state.query || state.errors.length > 0) {
		return;
	}
	if (state.parsedText !== view.state.doc.toString()) {
		return;
	}
	const range = rangeOfNode(state.query, state.selectedPath);
	if (!range || range.to > view.state.doc.length) {
		return;
	}
	const current = view.state.selection.main;
	if (current.from === range.from && current.to === range.to) {
		return;
	}
	view.dispatch({
		selection: EditorSelection.single(range.from, range.to),
		effects: EditorView.scrollIntoView(range.from, { y: "nearest" }),
		userEvent: TREE_SELECT_EVENT,
	});
};

const useStyles = makeStyles({
	body: {
		position: "relative",
		flexGrow: 1,
		minHeight: 0,
	},
	layer: {
		position: "absolute",
		inset: 0,
		display: "flex",
		flexDirection: "column",
		minHeight: 0,
	},
	hiddenLayer: {
		visibility: "hidden",
	},
	editor: {
		flexGrow: 1,
		minHeight: 0,
		padding: tokens.spacingHorizontalS,
	},
	tabs: {
		marginLeft: `calc(-1 * ${tokens.spacingHorizontalS})`,
	},
});

interface XmlPaneProps {
	onCollapse: () => void;
}

export const XmlPane = ({ onCollapse }: XmlPaneProps) => {
	const styles = useStyles();
	const store = useQueryBuilderStoreApi();
	const text = useQueryBuilder((state) => state.text);
	const setText = useQueryBuilder((state) => state.setText);
	const selectedPath = useQueryBuilder((state) => state.selectedPath);
	const selectionOrigin = useQueryBuilder((state) => state.selectionOrigin);
	const query = useQueryBuilder((state) => state.query);
	const errors = useQueryBuilder((state) => state.errors);
	const parsedText = useQueryBuilder((state) => state.parsedText);
	const namesLead = useQueryBuilder((state) => state.namesLead);
	const tab = useQueryBuilder((state) => state.layout.xmlTab);
	const setTab = useQueryBuilder((state) => state.setXmlTab);
	const { diagnostics } = useQueryDiagnostics();
	const { gateway, metadata, tables, loadTable } = useQueryEditing();
	const queryClient = useQueryClient();
	const viewRef = useRef<EditorView | null>(null);
	const [view, setView] = useState<EditorView | null>(null);

	useEffect(() => {
		const cached = (logicalName: string): TableLookup | null => {
			const key = gateway.key("getTable", { logicalName: logicalName.toLowerCase() });
			const table = queryClient.getQueryData<QueryTable>(key);
			if (table) {
				return { state: "loaded", table };
			}
			return queryClient.getQueryState(key)?.status === "error" ? { state: "missing" } : null;
		};
		if (!view) {
			return;
		}
		updateXmlCompletionServices(view, {
			metadata: layeredMetadata(cached, metadata),
			options: { names: namesLead, tables: tables ?? [] },
			requestTables: async (logicalNames) => {
				await Promise.all(logicalNames.map((logicalName) => loadTable(logicalName.toLowerCase())));
			},
		});
	}, [view, gateway, queryClient, metadata, tables, namesLead, loadTable]);

	const extensions = useMemo<Extension[]>(
		() => [
			fetchXmlCompletion,
			linter(null),
			xmlPaneTheme,
			EditorState.transactionExtender.of((transaction) => (transaction.annotation(ExternalChange) ? { annotations: isolateHistory.of("full") } : null)),
			EditorView.updateListener.of((update) => {
				const external = update.transactions.some((transaction) => transaction.annotation(ExternalChange));
				if (external) {
					queueMicrotask(() => revealSelection(update.view, store.getState()));
					return;
				}
				const fromTree = update.transactions.some((transaction) => transaction.isUserEvent(TREE_SELECT_EVENT));
				if (update.selectionSet && update.view.hasFocus && !fromTree) {
					store.getState().selectAtOffset(update.state.selection.main.head);
				}
			}),
		],
		[store]
	);

	useEffect(
		() =>
			store.getState().attachEditor({
				undo: () => (viewRef.current ? undo(viewRef.current) : false),
				redo: () => (viewRef.current ? redo(viewRef.current) : false),
			}),
		[store]
	);

	useEffect(() => {
		if (viewRef.current) {
			revealSelection(viewRef.current, store.getState());
		}
	}, [store, selectedPath, selectionOrigin, query]);

	useEffect(() => {
		if (!view || view.state.doc.toString() !== parsedText) {
			return;
		}
		view.dispatch(setDiagnostics(view.state, lintDiagnostics({ errors, diagnostics, length: view.state.doc.length })));
	}, [view, errors, diagnostics, parsedText]);

	return (
		<>
			<PaneHeader
				toggleIcon={PanelRightContract20Regular}
				toggleLabel="Collapse the Fetch XML"
				onToggle={onCollapse}
				actions={tab === "fetchxml" ? <XmlCopyButton /> : null}>
				<TabList className={styles.tabs} size="small" selectedValue={tab} onTabSelect={(_, data) => setTab(data.value as XmlPaneTab)}>
					<Tab value="fetchxml">Fetch XML</Tab>
					<Tab value="webapi">Web API</Tab>
				</TabList>
			</PaneHeader>
			{tab === "fetchxml" ? <ParseErrorBanner /> : null}
			<div className={styles.body}>
				<div
					className={mergeClasses(styles.layer, tab !== "fetchxml" && styles.hiddenLayer)}
					aria-hidden={tab !== "fetchxml"}
					inert={tab !== "fetchxml"}>
					<div className={styles.editor}>
						<CodeEditor
							value={text}
							language="xml"
							fill
							extensions={extensions}
							onChange={setText}
							onCreateEditor={(created) => {
								viewRef.current = created;
								setView(created);
							}}
							placeholder="Paste a Fetch XML Query here. Press Ctrl+Enter to run it."
						/>
					</div>
				</div>
				{tab === "webapi" ? (
					<div className={styles.layer}>
						<WebApiPane />
					</div>
				) : null}
			</div>
		</>
	);
};
