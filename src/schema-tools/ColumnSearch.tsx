import {
	Badge,
	Button,
	Checkbox,
	Input,
	Label,
	makeStyles,
	mergeClasses,
	MessageBar,
	MessageBarBody,
	Popover,
	PopoverSurface,
	PopoverTrigger,
	Text,
	tokens,
	useId,
} from "@fluentui/react-components";
import { Info20Regular, Search20Regular, Search24Regular } from "@fluentui/react-icons";
import { type KeyboardEvent } from "react";

import { describeError } from "@/shared/lib";

const STEPS = [
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
	steps: {
		display: "grid",
		gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
		columnGap: tokens.spacingHorizontalXL,
		rowGap: tokens.spacingVerticalL,
		margin: 0,
		padding: 0,
		listStyleType: "none",
	},
	stacked: {
		gridTemplateColumns: "minmax(0, 1fr)",
	},
	step: {
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		rowGap: tokens.spacingVerticalXS,
	},
	stepTitle: {
		marginTop: tokens.spacingVerticalXS,
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
	popover: {
		width: "300px",
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

interface HowItWorksProps {
	stacked?: boolean;
}

export const HowItWorks = ({ stacked = false }: HowItWorksProps) => {
	const styles = useStyles();
	return (
		<ol className={mergeClasses(styles.steps, stacked && styles.stacked)}>
			{STEPS.map((step, index) => (
				<li key={step.title} className={styles.step}>
					<Badge appearance="tint" color="brand" shape="circular" size="large">
						{index + 1}
					</Badge>
					<Text weight="semibold" className={styles.stepTitle}>
						{step.title}
					</Text>
					<Text size={200} className={styles.muted}>
						{step.text}
					</Text>
				</li>
			))}
		</ol>
	);
};

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
				<HowItWorks />
			</div>
		</div>
	);
};

export const ColumnSearchBar = ({ query, onQueryChange, customOnly, onCustomOnlyChange, onFind, finding, disabled, error }: ColumnSearchProps) => {
	const styles = useStyles();
	return (
		<>
			<div className={styles.bar}>
				<Input
					className={styles.barInput}
					aria-label="Column logical name"
					contentBefore={<Search20Regular />}
					placeholder="new_region"
					value={query}
					onChange={(_, data) => onQueryChange(data.value)}
					onKeyDown={onEnter(onFind)}
				/>
				<Checkbox label="Custom tables only" checked={customOnly} onChange={(_, data) => onCustomOnlyChange(data.checked === true)} />
				<Button disabled={disabled || finding || query.trim() === ""} onClick={onFind}>
					{finding ? "Finding..." : "Find tables"}
				</Button>
				<div className={styles.spacer} />
				<Popover positioning="below-end" withArrow>
					<PopoverTrigger disableButtonEnhancement>
						<Button appearance="subtle" icon={<Info20Regular />}>
							How it works
						</Button>
					</PopoverTrigger>
					<PopoverSurface className={styles.popover} aria-label="How Cross-Table Columns works">
						<HowItWorks stacked />
					</PopoverSurface>
				</Popover>
			</div>
			<SearchError error={error} />
		</>
	);
};
