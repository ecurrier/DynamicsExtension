import { isolateHistory, redo, undo } from "@codemirror/commands";
import { EditorSelection, EditorState, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { makeStyles, tokens } from "@fluentui/react-components";
import { PanelRightContract20Regular } from "@fluentui/react-icons";
import { ExternalChange } from "@uiw/react-codemirror";
import { useEffect, useMemo, useRef } from "react";

import { CodeEditor } from "@/shared/components";
import { rangeOfNode } from "@/shared/lib/fetchxml";

import { PaneHeader } from "./PaneChrome";
import { ParseErrorBanner } from "./ParseErrorBanner";
import { type QueryBuilderState, useQueryBuilder, useQueryBuilderStoreApi } from "./store";

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
	editor: {
		flexGrow: 1,
		minHeight: 0,
		padding: tokens.spacingHorizontalS,
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
	const viewRef = useRef<EditorView | null>(null);

	const extensions = useMemo<Extension[]>(
		() => [
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

	return (
		<>
			<PaneHeader title="Fetch XML" toggleIcon={PanelRightContract20Regular} toggleLabel="Collapse the Fetch XML" onToggle={onCollapse} />
			<ParseErrorBanner />
			<div className={styles.editor}>
				<CodeEditor
					value={text}
					language="xml"
					fill
					extensions={extensions}
					onChange={setText}
					onCreateEditor={(view) => {
						viewRef.current = view;
					}}
					placeholder="Paste a Fetch XML query here, then press Ctrl+Enter to run it"
				/>
			</div>
		</>
	);
};
