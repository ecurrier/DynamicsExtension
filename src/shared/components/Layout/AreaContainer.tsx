import { makeStyles, mergeClasses } from "@fluentui/react-components";
import { type PropsWithChildren } from "react";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: "16px",
		padding: "16px",
	},
	fill: {
		// A minimum, not a height: with a height the container stops at the fold and its bottom
		// padding sits above content that scrolls past it, so the last control met the page edge.
		minHeight: "100%",
		boxSizing: "border-box",
	},
	grow: {
		flex: 1,
		minWidth: 0,
	},
	row: {
		display: "flex",
		alignItems: "flex-end",
		flexWrap: "wrap",
		gap: "8px",
	},
	stack: {
		display: "flex",
		flexDirection: "column",
		gap: "12px",
	},
	stackFill: {
		flex: 1,
		minHeight: 0,
	},
});

interface LayoutProps extends PropsWithChildren {
	className?: string;
}

interface FillableProps extends LayoutProps {
	fill?: boolean;
}

export const AreaContainer = ({ children, className, fill = false }: FillableProps) => {
	const styles = useStyles();
	return <div className={mergeClasses(styles.root, fill && styles.fill, className)}>{children}</div>;
};

export const FormRow = ({ children, className }: LayoutProps) => {
	const styles = useStyles();
	return <div className={mergeClasses(styles.row, className)}>{children}</div>;
};

export const FormStack = ({ children, className, fill = false }: FillableProps) => {
	const styles = useStyles();
	return <div className={mergeClasses(styles.stack, fill && styles.stackFill, className)}>{children}</div>;
};

export const Grow = ({ children, className }: LayoutProps) => {
	const styles = useStyles();
	return <div className={mergeClasses(styles.grow, className)}>{children}</div>;
};
