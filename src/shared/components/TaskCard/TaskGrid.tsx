import { makeStyles } from "@fluentui/react-components";
import { type PropsWithChildren } from "react";

const useStyles = makeStyles({
	container: {
		containerType: "inline-size",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: "12px",
		padding: "16px",
		"@container (max-width: 560px)": {
			gridTemplateColumns: "minmax(0, 1fr)",
		},
	},
});

export const TaskGrid = ({ children }: PropsWithChildren) => {
	const styles = useStyles();
	return (
		<div className={styles.container}>
			<div className={styles.grid}>{children}</div>
		</div>
	);
};
