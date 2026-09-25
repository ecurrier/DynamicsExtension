import { Button, type ButtonProps, Card, CardHeader, makeStyles, mergeClasses, Text, tokens, Tooltip } from "@fluentui/react-components";
import { type FluentIcon } from "@fluentui/react-icons";
import { type ReactNode, useEffect, useRef } from "react";

import { type UtilityDefinition } from "@/modules/types";
import { useNavigationStore } from "@/shared/stores";

const HIGHLIGHT_DURATION_MS = 2400;

const useStyles = makeStyles({
	card: {
		height: "100%",
		outlineWidth: tokens.strokeWidthThick,
		outlineStyle: "solid",
		outlineColor: "transparent",
		outlineOffset: "2px",
		transitionProperty: "outline-color",
		transitionDuration: tokens.durationSlower,
		transitionTimingFunction: tokens.curveEasyEase,
	},
	highlighted: {
		outlineColor: tokens.colorBrandStroke1,
	},
	description: {
		color: tokens.colorNeutralForeground3,
	},
	footer: {
		display: "flex",
		justifyContent: "flex-end",
		gap: "8px",
		marginTop: "auto",
	},
});

export interface TaskCardProps {
	utility: UtilityDefinition;
	icon?: FluentIcon;
	actionLabel?: string;
	actionIcon?: ButtonProps["icon"];
	tooltip?: string;
	disabled?: boolean;
	loading?: boolean;
	onAction: () => void;
	extra?: ReactNode;
}

export const TaskCard = ({ utility, icon: Icon, actionLabel = "Run", actionIcon, tooltip, disabled, loading, onAction, extra }: TaskCardProps) => {
	const styles = useStyles();
	const cardRef = useRef<HTMLDivElement>(null);
	const highlighted = useNavigationStore((state) => state.highlightedUtilityId === utility.id);
	const clearHighlightedUtility = useNavigationStore((state) => state.clearHighlightedUtility);

	useEffect(() => {
		if (!highlighted) {
			return;
		}
		cardRef.current?.scrollIntoView({ block: "nearest" });
		const timer = window.setTimeout(clearHighlightedUtility, HIGHLIGHT_DURATION_MS);
		return () => window.clearTimeout(timer);
	}, [highlighted, clearHighlightedUtility]);

	const button = (
		<Button appearance="primary" size="small" icon={actionIcon} disabled={disabled || loading} onClick={onAction}>
			{loading ? "Working..." : actionLabel}
		</Button>
	);
	return (
		<Card ref={cardRef} className={mergeClasses(styles.card, highlighted && styles.highlighted)} size="small">
			<CardHeader image={Icon ? <Icon fontSize={24} /> : undefined} header={<Text weight="semibold">{utility.title}</Text>} />
			<Text size={200} className={styles.description}>
				{utility.description}
			</Text>
			<div className={styles.footer}>
				{extra}
				{tooltip ? (
					<Tooltip content={tooltip} relationship="description">
						{button}
					</Tooltip>
				) : (
					button
				)}
			</div>
		</Card>
	);
};
