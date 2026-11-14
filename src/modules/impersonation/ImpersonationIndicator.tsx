import { Badge, makeStyles, Tooltip } from "@fluentui/react-components";
import { PersonSwap16Regular } from "@fluentui/react-icons";

import { impersonationItem, useStorageItem } from "@/shared/storage";
import { useSessionStore } from "@/shared/stores";

const useStyles = makeStyles({
	badge: {
		minWidth: 0,
		maxWidth: "100%",
		flexShrink: 1,
		overflow: "hidden",
	},
	word: {
		flexShrink: 0,
		paddingRight: "4px",
	},
	name: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
});

export const ImpersonationIndicator = () => {
	const styles = useStyles();
	const tabId = useSessionStore((state) => state.tabId);
	const states = useStorageItem(impersonationItem);
	const active = tabId === null ? null : (states.data?.[String(tabId)] ?? null);
	if (!active) {
		return null;
	}
	const label = `Impersonating ${active.user.fullName}`;
	return (
		<Tooltip content={`Requests from this tab run as ${active.user.fullName}`} relationship="description">
			<Badge appearance="filled" color="warning" icon={<PersonSwap16Regular />} className={styles.badge} title={label} aria-label={label}>
				<span className={styles.word}>Impersonating</span>
				<span className={styles.name}>{active.user.fullName}</span>
			</Badge>
		</Tooltip>
	);
};
