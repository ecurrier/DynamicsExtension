import { Badge, type BadgeProps, makeStyles } from "@fluentui/react-components";

import { type ControlStateTag } from "@/shared/lib";

const TAG_COLORS: Record<ControlStateTag, BadgeProps["color"]> = {
	Hidden: "warning",
	"Read-only": "informative",
	Required: "danger",
	Recommended: "brand",
	Empty: "severe",
};

const useStyles = makeStyles({
	root: {
		display: "inline-flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "4px",
		whiteSpace: "normal",
	},
});

interface ControlStateBadgesProps {
	tags: ControlStateTag[];
	emptyLabel?: string;
}

export const ControlStateBadges = ({ tags, emptyLabel }: ControlStateBadgesProps) => {
	const styles = useStyles();
	return (
		<span className={styles.root}>
			{tags.length === 0 && emptyLabel ? (
				<Badge appearance="tint" size="small" color="success">
					{emptyLabel}
				</Badge>
			) : (
				tags.map((tag) => (
					<Badge key={tag} appearance="tint" size="small" color={TAG_COLORS[tag]}>
						{tag}
					</Badge>
				))
			)}
		</span>
	);
};
