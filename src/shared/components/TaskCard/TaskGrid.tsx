import { makeStyles } from "@fluentui/react-components";
import { type PropsWithChildren } from "react";

const useStyles = makeStyles({
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: "12px",
		padding: "16px",
	},
});

export const TaskGrid = ({ children }: PropsWithChildren) => {
	const styles = useStyles();
	return <div className={styles.grid}>{children}</div>;
};
