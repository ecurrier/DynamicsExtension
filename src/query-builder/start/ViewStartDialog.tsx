import {
	Button,
	Caption1,
	Dialog,
	DialogActions,
	DialogBody,
	DialogContent,
	DialogSurface,
	DialogTitle,
	makeStyles,
	MessageBar,
	MessageBarBody,
	Spinner,
	tokens,
} from "@fluentui/react-components";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SearchField } from "@/shared/components";
import { describeError } from "@/shared/lib";
import { type QueryView } from "@/shared/types";

import { type QueryGateway } from "../hooks";
import { editorText, groupViews, rootTableName } from "../lib";
import { useQueryBuilder, useQueryBuilderStoreApi } from "../store";
import { TableField } from "./TableField";
import { ViewGroup } from "./ViewGroup";

const useStyles = makeStyles({
	content: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalM,
	},
	list: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalM,
		height: "320px",
		overflowY: "auto",
		paddingRight: tokens.spacingHorizontalXS,
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
});

interface ViewListProps {
	gateway: QueryGateway;
	logicalName: string;
	onPick: (view: QueryView) => void;
}

const ViewList = ({ gateway, logicalName, onPick }: ViewListProps) => {
	const styles = useStyles();
	const [filter, setFilter] = useState("");
	const views = useQuery({
		queryKey: gateway.key("listViews", { logicalName }),
		queryFn: () => gateway.ops.listViews({ logicalName }),
		enabled: gateway.ready,
		staleTime: 60_000,
		retry: false,
	});
	if (views.isLoading) {
		return <Spinner size="tiny" label="Loading the views" labelPosition="after" />;
	}
	if (views.isError) {
		return (
			<MessageBar intent="error">
				<MessageBarBody>{`Cannot read the views. ${describeError(views.error)}`}</MessageBarBody>
			</MessageBar>
		);
	}
	const list = views.data;
	if (!list) {
		return null;
	}
	const groups = groupViews(list.views, filter);
	const personalNote = list.personalViewsUnavailable ?? (filter.trim() === "" ? "This Table has no Personal Views that you can see." : "No matches.");
	return (
		<>
			<SearchField autoFocus aria-label="Filter the views" placeholder="Filter the views" value={filter} onChange={setFilter} />
			<div className={styles.list}>
				<ViewGroup
					title="System Views"
					views={groups.system}
					empty={filter.trim() === "" ? "This Table has no System Views." : "No matches."}
					onPick={onPick}
				/>
				<ViewGroup
					title="Personal Views"
					views={groups.personal}
					empty={personalNote}
					warning={list.personalViewsUnavailable !== null}
					onPick={onPick}
				/>
			</div>
		</>
	);
};

interface ViewStartDialogProps {
	open: boolean;
	gateway: QueryGateway;
	onClose: () => void;
}

export const ViewStartDialog = ({ open, gateway, onClose }: ViewStartDialogProps) => {
	const styles = useStyles();
	const store = useQueryBuilderStoreApi();
	const currentTable = useQueryBuilder((state) => (state.query ? rootTableName(state.query) : null));
	const [picked, setPicked] = useState<string | null>(null);
	const logicalName = picked ?? currentTable;

	const close = () => {
		setPicked(null);
		onClose();
	};

	const onPick = (view: QueryView) => {
		const text = editorText(view.fetchXml);
		store.getState().loadQuery(text, { storedQueryId: null, loadedText: text });
		close();
	};

	return (
		<Dialog open={open} onOpenChange={(_, data) => (data.open ? undefined : close())}>
			<DialogSurface style={{ maxWidth: "520px" }}>
				<DialogBody>
					<DialogTitle>Start from a view</DialogTitle>
					<DialogContent className={styles.content}>
						{open ? (
							<>
								<TableField gateway={gateway} value={logicalName} onPick={setPicked} />
								{logicalName ? (
									<ViewList key={logicalName} gateway={gateway} logicalName={logicalName} onPick={onPick} />
								) : (
									<Caption1 className={styles.muted}>Select a Table to see its views.</Caption1>
								)}
							</>
						) : null}
					</DialogContent>
					<DialogActions>
						<Button appearance="secondary" onClick={close}>
							Cancel
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
