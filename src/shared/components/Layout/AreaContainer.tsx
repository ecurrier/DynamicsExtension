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
		height: "100%",
		boxSizing: "border-box",
	},
	toolbar: {
		display: "flex",
		alignItems: "flex-end",
		gap: "8px",
	},
	grow: {
		flex: 1,
		minWidth: 0,
	},
	row: {
		display: "flex",
		alignItems: "flex-end",
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

export const AreaToolbar = ({ children, className }: LayoutProps) => {
	const styles = useStyles();
	return <div className={mergeClasses(styles.toolbar, className)}>{children}</div>;
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
