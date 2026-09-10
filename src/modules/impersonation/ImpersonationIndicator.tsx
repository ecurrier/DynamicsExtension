import { Badge, Tooltip } from "@fluentui/react-components";
import { PersonSwap16Regular } from "@fluentui/react-icons";

import { impersonationItem, useStorageItem } from "@/shared/storage";
import { useSessionStore } from "@/shared/stores";

export const ImpersonationIndicator = () => {
	const tabId = useSessionStore((state) => state.tabId);
	const states = useStorageItem(impersonationItem);
	const active = tabId === null ? null : (states.data?.[String(tabId)] ?? null);
	if (!active) {
		return null;
	}
	return (
		<Tooltip content={`Requests from this tab run as ${active.user.fullName}`} relationship="description">
			<Badge appearance="filled" color="warning" icon={<PersonSwap16Regular />}>
				Impersonating {active.user.fullName}
			</Badge>
		</Tooltip>
	);
};
