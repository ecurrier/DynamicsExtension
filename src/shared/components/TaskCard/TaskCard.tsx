import { Button, type ButtonProps, Card, CardHeader, makeStyles, Text, tokens, Tooltip } from "@fluentui/react-components";
import { type FluentIcon } from "@fluentui/react-icons";
import { type ReactNode } from "react";

const useStyles = makeStyles({
	card: {
		height: "100%",
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
	title: string;
	description: string;
	icon?: FluentIcon;
	actionLabel?: string;
	actionIcon?: ButtonProps["icon"];
	tooltip?: string;
	disabled?: boolean;
	loading?: boolean;
	onAction: () => void;
	extra?: ReactNode;
}

export const TaskCard = ({ title, description, icon: Icon, actionLabel = "Run", actionIcon, tooltip, disabled, loading, onAction, extra }: TaskCardProps) => {
	const styles = useStyles();
	const button = (
		<Button appearance="primary" size="small" icon={actionIcon} disabled={disabled || loading} onClick={onAction}>
			{loading ? "Working..." : actionLabel}
		</Button>
	);
	return (
		<Card className={styles.card} size="small">
			<CardHeader image={Icon ? <Icon fontSize={24} /> : undefined} header={<Text weight="semibold">{title}</Text>} />
			<Text size={200} className={styles.description}>
				{description}
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
