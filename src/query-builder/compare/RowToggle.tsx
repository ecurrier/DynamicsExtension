import { Button, makeStyles } from "@fluentui/react-components";
import { ChevronDown16Regular, ChevronRight16Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
	button: {
		minWidth: "20px",
		width: "20px",
		height: "20px",
		padding: 0,
	},
});

interface RowToggleProps {
	open: boolean;
	onToggle: () => void;
}

export const RowToggle = ({ open, onToggle }: RowToggleProps) => {
	const styles = useStyles();
	return (
		<Button
			size="small"
			appearance="transparent"
			className={styles.button}
			tabIndex={-1}
			icon={open ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
			aria-label={open ? "Hide the values" : "Show the values"}
			aria-expanded={open}
			onClick={onToggle}
		/>
	);
};
