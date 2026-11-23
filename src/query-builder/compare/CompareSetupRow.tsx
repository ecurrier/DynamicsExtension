import { Button, Dropdown, makeStyles, Option, Text, tokens, Tooltip } from "@fluentui/react-components";
import { ArrowSwap20Regular } from "@fluentui/react-icons";

import { type CompareSetup, type ConnectionRunEntry, type MatchKeyKind, type ResultGridColumn } from "../lib";
import { ColumnsDropdown } from "./ColumnsDropdown";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		flexShrink: 0,
		rowGap: tokens.spacingVerticalXXS,
	},
	row: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalS,
		rowGap: tokens.spacingVerticalXS,
	},
	group: {
		display: "inline-flex",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalXS,
	},
	connection: {
		minWidth: "130px",
		maxWidth: "220px",
	},
	kind: {
		minWidth: "120px",
	},
	label: {
		color: tokens.colorNeutralForeground2,
		whiteSpace: "nowrap",
	},
	hint: {
		color: tokens.colorNeutralForeground3,
	},
});

interface ConnectionDropdownProps {
	label: string;
	selected: ConnectionRunEntry;
	choices: readonly ConnectionRunEntry[];
	disabled: boolean;
	onSelect: (key: string) => void;
}

const ConnectionDropdown = ({ label, selected, choices, disabled, onSelect }: ConnectionDropdownProps) => {
	const styles = useStyles();
	return (
		<Dropdown
			size="small"
			className={styles.connection}
			aria-label={label}
			disabled={disabled}
			value={selected.name}
			title={selected.name}
			selectedOptions={[selected.key]}
			onOptionSelect={(_, data) => (data.optionValue ? onSelect(data.optionValue) : undefined)}>
			{choices.map((entry) => (
				<Option key={entry.key} value={entry.key} text={entry.name}>
					{entry.name}
				</Option>
			))}
		</Dropdown>
	);
};

const KEY_COLUMNS_HINT = "The list shows the Columns of the Query. To use another Column, add it to the Query.";

const keySummary = (choices: readonly ResultGridColumn[], selected: readonly string[]): string =>
	selected
		.map((key) => choices.find((column) => column.key === key)?.label)
		.filter((label): label is string => label !== undefined)
		.join(", ");

interface CompareSetupRowProps {
	entries: readonly ConnectionRunEntry[];
	first: ConnectionRunEntry;
	second: ConnectionRunEntry;
	setup: CompareSetup;
	keyChoices: readonly ResultGridColumn[];
	keyColumns: readonly string[];
	comparedChoices: readonly ResultGridColumn[];
	compared: readonly string[];
	disabled: boolean;
	canCompare: boolean;
	reason: string | null;
	onChooseSide: (side: "first" | "second", key: string) => void;
	onSwap: () => void;
	onSetupChange: (setup: CompareSetup) => void;
	onCompare: () => void;
}

export const CompareSetupRow = ({
	entries,
	first,
	second,
	setup,
	keyChoices,
	keyColumns,
	comparedChoices,
	compared,
	disabled,
	canCompare,
	reason,
	onChooseSide,
	onSwap,
	onSetupChange,
	onCompare,
}: CompareSetupRowProps) => {
	const styles = useStyles();
	return (
		<div className={styles.root}>
			<div className={styles.row}>
				<span className={styles.group}>
					<ConnectionDropdown
						label="First Query Run"
						selected={first}
						choices={entries.filter((entry) => entry.key !== second.key)}
						disabled={disabled}
						onSelect={(key) => onChooseSide("first", key)}
					/>
					<Tooltip content="Swap the Query Runs" relationship="label">
						<Button size="small" appearance="subtle" icon={<ArrowSwap20Regular />} disabled={disabled} onClick={onSwap} />
					</Tooltip>
					<ConnectionDropdown
						label="Second Query Run"
						selected={second}
						choices={entries.filter((entry) => entry.key !== first.key)}
						disabled={disabled}
						onSelect={(key) => onChooseSide("second", key)}
					/>
				</span>
				<span className={styles.group}>
					<Text size={200} className={styles.label}>
						Match Key
					</Text>
					<Dropdown
						size="small"
						className={styles.kind}
						aria-label="Match Key"
						disabled={disabled}
						value={setup.matchKeyKind === "primaryKey" ? "Primary key" : "Columns"}
						selectedOptions={[setup.matchKeyKind]}
						onOptionSelect={(_, data) => onSetupChange({ ...setup, matchKeyKind: data.optionValue as MatchKeyKind })}>
						<Option value="primaryKey">Primary key</Option>
						<Option value="columns">Columns</Option>
					</Dropdown>
					{setup.matchKeyKind === "columns" ? (
						<ColumnsDropdown
							label="Match Key Columns"
							choices={keyChoices}
							selected={keyColumns}
							summary={keySummary(keyChoices, keyColumns)}
							hint={KEY_COLUMNS_HINT}
							disabled={disabled}
							onChange={(selected) => onSetupChange({ ...setup, keyColumns: selected })}
						/>
					) : null}
				</span>
				<span className={styles.group}>
					<Text size={200} className={styles.label}>
						Columns compared
					</Text>
					<ColumnsDropdown
						label="Columns compared"
						choices={comparedChoices}
						selected={compared}
						summary={`${compared.length} of ${comparedChoices.length}`}
						disabled={disabled}
						onChange={(selected) => onSetupChange({ ...setup, comparedColumns: selected })}
					/>
				</span>
				<Button size="small" appearance="primary" disabled={!canCompare} onClick={onCompare}>
					Compare
				</Button>
				{reason ? (
					<Text size={200} className={styles.hint}>
						{reason}
					</Text>
				) : null}
			</div>
		</div>
	);
};
