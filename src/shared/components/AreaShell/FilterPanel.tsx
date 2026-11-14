import { Badge, Button, makeStyles, Popover, PopoverSurface, PopoverTrigger, Text, tokens } from "@fluentui/react-components";
import { Filter20Regular } from "@fluentui/react-icons";
import { type ReactNode, useState } from "react";

const useStyles = makeStyles({
	trigger: {
		flexShrink: 0,
	},
	count: {
		marginInlineStart: "4px",
	},
	surface: {
		display: "flex",
		flexDirection: "column",
		gap: "12px",
		minWidth: "260px",
		maxWidth: "min(360px, 90vw)",
	},
	head: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
	},
	title: {
		flex: 1,
		minWidth: 0,
		fontWeight: tokens.fontWeightSemibold,
	},
	controls: {
		display: "flex",
		flexDirection: "column",
		gap: "12px",
	},
	footer: {
		display: "flex",
		justifyContent: "flex-end",
		gap: "8px",
	},
});

interface FilterPanelProps {
	/** How many filters are set. It shows on the button, so a narrowed list is never a surprise. */
	count: number;
	children: ReactNode;
	onClear?: () => void;
	/** An apply action, for filters the server runs rather than the open list. */
	onApply?: () => void;
	applyLabel?: string;
	applying?: boolean;
}

/** The filters of an Area, behind one button that says how many are set. Escape closes it. */
export const FilterPanel = ({ count, children, onClear, onApply, applyLabel = "Apply filters", applying = false }: FilterPanelProps) => {
	const styles = useStyles();
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open} onOpenChange={(_, data) => setOpen(data.open)} positioning="below-end" trapFocus>
			<PopoverTrigger disableButtonEnhancement>
				<Button className={styles.trigger} icon={<Filter20Regular />} aria-label={count === 0 ? "Filters" : `Filters, ${count} set`}>
					Filters
					{count === 0 ? null : (
						<Badge className={styles.count} appearance="filled" color="brand" size="small">
							{count}
						</Badge>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverSurface className={styles.surface}>
				<div className={styles.head}>
					<Text className={styles.title}>Filters</Text>
					{onClear && count > 0 ? (
						<Button appearance="subtle" size="small" onClick={onClear}>
							Clear all
						</Button>
					) : null}
				</div>
				<div className={styles.controls}>{children}</div>
				{onApply ? (
					<div className={styles.footer}>
						<Button
							appearance="primary"
							disabled={applying}
							onClick={() => {
								onApply();
								setOpen(false);
							}}>
							{applying ? "Loading..." : applyLabel}
						</Button>
					</div>
				) : null}
			</PopoverSurface>
		</Popover>
	);
};
