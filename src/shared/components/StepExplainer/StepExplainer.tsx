import { Badge, Button, makeStyles, mergeClasses, Popover, PopoverSurface, PopoverTrigger, Text, tokens } from "@fluentui/react-components";
import { Info20Regular } from "@fluentui/react-icons";

export interface ExplainerStep {
	title: string;
	text: string;
}

const useStyles = makeStyles({
	steps: {
		display: "grid",
		// Follows the length of the list, and the width it is given.
		gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
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
	muted: {
		color: tokens.colorNeutralForeground3,
	},
	popover: {
		width: "300px",
	},
});

interface StepExplainerProps {
	steps: ExplainerStep[];
	/** One step per line, for the popover. */
	stacked?: boolean;
}

/**
 * The numbered 1-2-3 display an Area shows while it has nothing to show yet. The state follows the
 * work rather than a stored preference, so the explainer comes back by itself when the user returns
 * to an empty screen months later.
 */
export const StepExplainer = ({ steps, stacked = false }: StepExplainerProps) => {
	const styles = useStyles();
	return (
		<ol className={mergeClasses(styles.steps, stacked && styles.stacked)}>
			{steps.map((step, index) => (
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

interface StepExplainerButtonProps {
	steps: ExplainerStep[];
	/** Names what is explained, for the screen reader: "How Cross-Table Columns works". */
	label: string;
}

/** The same steps once the user has started work: a subtle button with the stacked steps behind it. */
export const StepExplainerButton = ({ steps, label }: StepExplainerButtonProps) => {
	const styles = useStyles();
	return (
		<Popover positioning="below-end" withArrow>
			<PopoverTrigger disableButtonEnhancement>
				<Button appearance="subtle" icon={<Info20Regular />}>
					How it works
				</Button>
			</PopoverTrigger>
			<PopoverSurface className={styles.popover} aria-label={label}>
				<StepExplainer steps={steps} stacked />
			</PopoverSurface>
		</Popover>
	);
};
