import { Button, Caption1, Tooltip } from "@fluentui/react-components";
import { Delete20Regular, Rename20Regular } from "@fluentui/react-icons";

import { type StoredQuery } from "@/shared/storage";

import { timeText } from "../lib";
import { fetchXmlTableName } from "../remembered";
import { useEntryStyles } from "./entryStyles";

interface StoredQueryItemProps {
	storedQuery: StoredQuery;
	current: boolean;
	onOpen: (storedQuery: StoredQuery) => void;
	onRename: (storedQuery: StoredQuery) => void;
	onDelete: (storedQuery: StoredQuery) => void;
}

export const StoredQueryItem = ({ storedQuery, current, onOpen, onRename, onDelete }: StoredQueryItemProps) => {
	const styles = useEntryStyles();
	const table = fetchXmlTableName(storedQuery.fetchXml);
	return (
		<li className={styles.entry}>
			<div className={styles.row}>
				<button type="button" className={styles.open} aria-current={current || undefined} onClick={() => onOpen(storedQuery)}>
					<span className={styles.title}>{storedQuery.name}</span>
					<Caption1 className={styles.meta}>
						<span className={styles.mono}>{table ?? "No Table"}</span> · {timeText(storedQuery.updatedAt)}
					</Caption1>
				</button>
				<Tooltip content={`Rename "${storedQuery.name}"`} relationship="label">
					<Button appearance="subtle" size="small" icon={<Rename20Regular />} onClick={() => onRename(storedQuery)} />
				</Tooltip>
				<Tooltip content={`Delete "${storedQuery.name}"`} relationship="label">
					<Button appearance="subtle" size="small" icon={<Delete20Regular />} onClick={() => onDelete(storedQuery)} />
				</Tooltip>
			</div>
		</li>
	);
};
