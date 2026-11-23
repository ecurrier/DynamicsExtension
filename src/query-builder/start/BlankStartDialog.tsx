import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from "@fluentui/react-components";

import { type QueryGateway } from "../hooks";
import { blankQueryText, findTable } from "../lib";
import { useQueryBuilderStoreApi } from "../store";
import { TableField } from "./TableField";
import { useTableList } from "./useTableList";

interface BlankStartDialogProps {
	open: boolean;
	gateway: QueryGateway;
	onClose: () => void;
}

export const BlankStartDialog = ({ open, gateway, onClose }: BlankStartDialogProps) => {
	const store = useQueryBuilderStoreApi();
	const tables = useTableList(gateway);

	const onPick = (logicalName: string) => {
		const table = findTable(tables.data ?? [], logicalName);
		if (!table) {
			return;
		}
		const text = blankQueryText(table);
		store.getState().loadQuery(text, { storedQueryId: null, loadedText: text });
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
			<DialogSurface style={{ maxWidth: "440px" }}>
				<DialogBody>
					<DialogTitle>Start from a Table</DialogTitle>
					<DialogContent>{open ? <TableField gateway={gateway} value={null} onPick={onPick} /> : null}</DialogContent>
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
