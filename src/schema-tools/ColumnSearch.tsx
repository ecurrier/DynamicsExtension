import { Button, Checkbox, Input, Label, makeStyles, MessageBar, MessageBarBody, Text, tokens, useId } from "@fluentui/react-components";
import { Search24Regular } from "@fluentui/react-icons";
import { type KeyboardEvent } from "react";

import { type ExplainerStep, SearchField, StepExplainer, StepExplainerButton } from "@/shared/components";
import { describeError } from "@/shared/lib";

export const COLUMN_SEARCH_STEPS: ExplainerStep[] = [
	{ title: "Find", text: "Every table carrying the column, with its current label, type, and requirement level side by side." },
	{
		title: "Pick and set",
		text: "Choose the tables to change and the values they should have. Columns locked by a managed solution are listed but can't be picked.",
	},
	{ title: "Review and apply", text: "Preview every change first. Tables are updated one at a time, and the ones that succeed are published." },
];

const useStyles = makeStyles({
	start: {
		display: "flex",
		justifyContent: "center",
		boxSizing: "border-box",
		minHeight: "100%",
		padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalXL}`,
	},
	column: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXXL,
		width: "100%",
		maxWidth: "720px",
	},
	intro: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalS,
	},
	title: {
		margin: 0,
	},
	lede: {
		color: tokens.colorNeutralForeground2,
	},
	card: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalM,
		padding: tokens.spacingHorizontalXL,
		borderRadius: tokens.borderRadiusXLarge,
		backgroundColor: tokens.colorNeutralBackground1,
		boxShadow: tokens.shadow4,
	},
	inputRow: {
		display: "flex",
		columnGap: tokens.spacingHorizontalS,
	},
	input: {
		flexGrow: 1,
		minWidth: 0,
	},
	options: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		columnGap: tokens.spacingHorizontalL,
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
	bar: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: tokens.spacingHorizontalM,
		rowGap: tokens.spacingVerticalS,
	},
	barInput: {
		width: "320px",
		maxWidth: "100%",
	},
	spacer: {
		flexGrow: 1,
	},
});

export interface ColumnSearchProps {
	query: string;
	onQueryChange: (query: string) => void;
	customOnly: boolean;
	onCustomOnlyChange: (customOnly: boolean) => void;
	onFind: () => void;
	finding: boolean;
	disabled: boolean;
	error: Error | null;
}

const onEnter = (action: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
	if (event.key === "Enter") {
		action();
	}
};

const SearchError = ({ error }: { error: Error | null }) =>
	error ? (
		<MessageBar intent="error">
			<MessageBarBody>{describeError(error)}</MessageBarBody>
		</MessageBar>
	) : null;

export const ColumnSearchStart = ({ query, onQueryChange, customOnly, onCustomOnlyChange, onFind, finding, disabled, error }: ColumnSearchProps) => {
	const styles = useStyles();
	const inputId = useId("column-name");
	const hintId = `${inputId}-hint`;
	return (
		<div className={styles.start}>
			<div className={styles.column}>
				<div className={styles.intro}>
					<Text as="h1" size={600} weight="semibold" className={styles.title}>
						Line up a column across tables
					</Text>
					<Text className={styles.lede}>
						The same column often lives on several tables, and over time its label, description, and requirement level drift apart. Find every table
						that has it, then set them together in one run.
					</Text>
				</div>
				<div className={styles.card}>
					<Label htmlFor={inputId} weight="semibold">
						Column logical name
					</Label>
					<div className={styles.inputRow}>
						<Input
							id={inputId}
							className={styles.input}
							size="large"
							contentBefore={<Search24Regular />}
							placeholder="new_region"
							aria-describedby={hintId}
							autoFocus
							value={query}
							onChange={(_, data) => onQueryChange(data.value)}
							onKeyDown={onEnter(onFind)}
						/>
						<Button appearance="primary" size="large" disabled={disabled || finding || query.trim() === ""} onClick={onFind}>
							{finding ? "Finding..." : "Find tables"}
						</Button>
					</div>
					<div className={styles.options}>
						<Checkbox label="Custom tables only" checked={customOnly} onChange={(_, data) => onCustomOnlyChange(data.checked === true)} />
						<Text id={hintId} size={200} className={styles.muted}>
							Use the logical name, including its publisher prefix.
						</Text>
					</div>
					<SearchError error={error} />
				</div>
				<StepExplainer steps={COLUMN_SEARCH_STEPS} />
			</div>
		</div>
	);
};

export const ColumnSearchBar = ({ query, onQueryChange, customOnly, onCustomOnlyChange, onFind, finding, disabled, error }: ColumnSearchProps) => {
	const styles = useStyles();
	return (
		<>
			<div className={styles.bar}>
				<SearchField
					className={styles.barInput}
					aria-label="Column logical name"
					placeholder="Search for a column, such as new_region"
					value={query}
					onChange={onQueryChange}
					onKeyDown={onEnter(onFind)}
				/>
				<Checkbox label="Custom tables only" checked={customOnly} onChange={(_, data) => onCustomOnlyChange(data.checked === true)} />
				<Button disabled={disabled || finding || query.trim() === ""} onClick={onFind}>
					{finding ? "Finding..." : "Find tables"}
				</Button>
				<div className={styles.spacer} />
				<StepExplainerButton steps={COLUMN_SEARCH_STEPS} label="How Cross-Table Columns works" />
			</div>
			<SearchError error={error} />
		</>
	);
};
