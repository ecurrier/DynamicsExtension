import { Badge, type BadgeProps, makeStyles, mergeClasses } from "@fluentui/react-components";

import { badgeText } from "./badgeText";

/**
 * Fluent's `Badge` root sets `height` and `min-width` and nothing else, so a badge is the one
 * element in a row that cannot give way. These classes let it shrink and ellipsise.
 */
export const useBadgeStyles = makeStyles({
	badge: {
		minWidth: 0,
		maxWidth: "100%",
		flexShrink: 1,
		overflow: "hidden",
	},
	label: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
});

export interface TextBadgeProps extends BadgeProps {
	/** The untruncated text. Taken from the children when it is not given. */
	title?: string;
}

/** A badge whose label truncates with an ellipsis and carries its full text in a `title`. */
export const TextBadge = ({ children, className, title, ...props }: TextBadgeProps) => {
	const styles = useBadgeStyles();
	return (
		<Badge {...props} className={mergeClasses(styles.badge, className)} title={title ?? badgeText(children)}>
			<span className={styles.label}>{children}</span>
		</Badge>
	);
};
