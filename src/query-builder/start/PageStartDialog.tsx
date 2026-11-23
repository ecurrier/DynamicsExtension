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

import { usePageQuery } from "@/messaging/client";
import { describeError } from "@/shared/lib";
import { type NamedFetchXml } from "@/shared/types";

import { editorText } from "../lib";
import { fetchXmlTableName } from "../remembered";
import { useQueryBuilderStoreApi } from "../store";
import { PickItem, PickList } from "./PickList";

const useStyles = makeStyles({
	list: {
		maxHeight: "360px",
		overflowY: "auto",
	},
	muted: {
		color: tokens.colorNeutralForeground3,
		fontFamily: tokens.fontFamilyMonospace,
	},
});

interface PageStartDialogProps {
	open: boolean;
	onClose: () => void;
}

export const PageStartDialog = ({ open, onClose }: PageStartDialogProps) => {
	const styles = useStyles();
	const store = useQueryBuilderStoreApi();
	const grids = usePageQuery("utilities.generateFetchXml", undefined, { enabled: open });

	const onPick = (grid: NamedFetchXml) => {
		const text = editorText(grid.fetchXml);
		store.getState().loadQuery(text, { storedQueryId: null, loadedText: text });
		onClose();
	};

	const body = () => {
		if (grids.isLoading) {
			return <Spinner size="tiny" label="Reading the page" labelPosition="after" />;
		}
		if (grids.isError) {
			return (
				<MessageBar intent="error">
					<MessageBarBody>{`Cannot read the grids on the page. ${describeError(grids.error)}`}</MessageBarBody>
				</MessageBar>
			);
		}
		const list = grids.data ?? [];
		if (list.length === 0) {
			return <Caption1>The page has no grids or subgrids.</Caption1>;
		}
		return (
			<div className={styles.list}>
				<PickList>
					{list.map((grid, index) => (
						<PickItem key={`${index}-${grid.name}`} onPick={() => onPick(grid)}>
							{grid.name}
							<Caption1 className={styles.muted}>{fetchXmlTableName(grid.fetchXml) ?? ""}</Caption1>
						</PickItem>
					))}
				</PickList>
			</div>
		);
	};

	return (
		<Dialog open={open} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
			<DialogSurface style={{ maxWidth: "520px" }}>
				<DialogBody>
					<DialogTitle>Start from the open page</DialogTitle>
					<DialogContent>{open ? body() : null}</DialogContent>
					<DialogActions>
						<Button appearance="secondary" onClick={onClose}>
							Cancel
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
