import { Button, makeStyles, Tooltip } from "@fluentui/react-components";
import { Info16Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
	trigger: {
		minWidth: "20px",
		maxWidth: "20px",
		height: "20px",
		padding: 0,
		marginLeft: "4px",
		verticalAlign: "middle",
	},
});

interface InfoTipProps {
	content: string;
}

/**
 * A button, not a bare icon. A tooltip hung on an svg cannot be reached by keyboard at all, so its
 * help text did not exist for anyone who does not use a mouse.
 */
export const InfoTip = ({ content }: InfoTipProps) => {
	const styles = useStyles();
	return (
		<Tooltip content={content} relationship="description" withArrow>
			<Button className={styles.trigger} appearance="transparent" size="small" icon={<Info16Regular />} aria-label="More information" />
		</Tooltip>
	);
};
