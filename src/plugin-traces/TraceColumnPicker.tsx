import { Button, Checkbox, makeStyles, Popover, PopoverSurface, PopoverTrigger, Text, tokens } from "@fluentui/react-components";
import { Column20Regular } from "@fluentui/react-icons";

import { DEFAULT_TRACE_COLUMNS, TRACE_COLUMN_ORDER, toggledTraceColumns } from "./lib";
import { TRACE_COLUMN_LABELS } from "./traceColumns";

const useStyles = makeStyles({
	trigger: {
		flexShrink: 0,
	},
	surface: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		minWidth: "200px",
	},
	head: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		marginBottom: "4px",
	},
	title: {
		flex: 1,
		minWidth: 0,
		fontWeight: tokens.fontWeightSemibold,
	},
});

interface TraceColumnPickerProps {
	shown: string[];
	onChange: (columns: string[]) => void;
}

/** Hides and shows the trace table's columns. It does not reorder: the user resizes with the mouse. */
export const TraceColumnPicker = ({ shown, onChange }: TraceColumnPickerProps) => {
	const styles = useStyles();
	return (
		<Popover positioning="below-end" trapFocus>
			<PopoverTrigger disableButtonEnhancement>
				<Button className={styles.trigger} icon={<Column20Regular />}>
					Columns
				</Button>
			</PopoverTrigger>
			<PopoverSurface className={styles.surface}>
				<div className={styles.head}>
					<Text className={styles.title}>Columns</Text>
					<Button appearance="subtle" size="small" onClick={() => onChange(DEFAULT_TRACE_COLUMNS)}>
						Reset to default
					</Button>
				</div>
				{TRACE_COLUMN_ORDER.map((column) => (
					<Checkbox
						key={column}
						label={TRACE_COLUMN_LABELS[column] ?? column}
						checked={shown.includes(column)}
						onChange={() => onChange(toggledTraceColumns(shown, column))}
					/>
				))}
			</PopoverSurface>
		</Popover>
	);
};
