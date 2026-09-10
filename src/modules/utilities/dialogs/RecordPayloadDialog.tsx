import {
	Button,
	Dialog,
	DialogActions,
	DialogBody,
	DialogContent,
	DialogSurface,
	DialogTitle,
	Field,
	makeStyles,
	Radio,
	RadioGroup,
	Text,
	tokens,
} from "@fluentui/react-components";
import { useMemo, useState } from "react";

import { CodeBlock, CopyButton, FormRow, FormStack, Grow } from "@/shared/components";
import { type CodegenTable } from "@/shared/types";

import { buildRecordPayload, formatPayload, type PayloadMode } from "../lib";

const useStyles = makeStyles({
	surface: {
		maxWidth: "760px",
	},
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

export interface RecordPayloadDialogSource {
	values: Record<string, unknown>;
	table: CodegenTable;
}

interface RecordPayloadDialogProps {
	open: boolean;
	source: RecordPayloadDialogSource | null;
	onClose: () => void;
}

export const RecordPayloadDialog = ({ open, source, onClose }: RecordPayloadDialogProps) => {
	const styles = useStyles();
	const [mode, setMode] = useState<PayloadMode>("create");
	const payload = useMemo(() => (source ? buildRecordPayload(source.values, source.table, mode) : {}), [source, mode]);
	const text = useMemo(() => formatPayload(payload), [payload]);
	const count = Object.keys(payload).length;

	return (
		<Dialog open={open} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
			<DialogSurface className={styles.surface}>
				<DialogBody>
					<DialogTitle>{source ? `Record Payload (${source.table.entitySetName})` : "Record Payload"}</DialogTitle>
					<DialogContent>
						<FormStack>
							<FormRow>
								<Grow>
									<Field label="Body">
										<RadioGroup layout="horizontal" value={mode} onChange={(_, data) => setMode(data.value as PayloadMode)}>
											<Radio value="create" label="Create" />
											<Radio value="update" label="Update" />
										</RadioGroup>
									</Field>
								</Grow>
								<CopyButton text={text} label="Copy" successMessage="Payload copied to clipboard" appearance="primary" />
							</FormRow>
							<Text size={200} className={styles.caption}>
								{count} column{count === 1 ? "" : "s"} with a value. Lookups are bound with @odata.bind, read-only and system columns are left
								out, and the id is omitted since it goes in the URL.
							</Text>
							<CodeBlock value={text} language="json" height="360px" />
						</FormStack>
					</DialogContent>
					<DialogActions>
						<Button appearance="secondary" onClick={onClose}>
							Close
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
