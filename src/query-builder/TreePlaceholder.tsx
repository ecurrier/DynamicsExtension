import { makeStyles, Text, tokens } from "@fluentui/react-components";
import { PanelLeftContract20Regular } from "@fluentui/react-icons";

import { PaneHeader } from "./PaneChrome";

const useStyles = makeStyles({
	body: {
		flexGrow: 1,
		minHeight: 0,
		overflow: "auto",
		padding: tokens.spacingHorizontalM,
	},
	text: {
		color: tokens.colorNeutralForeground3,
	},
});

interface TreePlaceholderProps {
	onCollapse: () => void;
}

export const TreePlaceholder = ({ onCollapse }: TreePlaceholderProps) => {
	const styles = useStyles();
	return (
		<>
			<PaneHeader title="Tree" toggleIcon={PanelLeftContract20Regular} toggleLabel="Collapse the tree" onToggle={onCollapse} />
			<div className={styles.body}>
				<Text size={200} className={styles.text}>
					The Query tree arrives in a later update. For now, write or paste the Query as Fetch XML on the right.
				</Text>
			</div>
		</>
	);
};
