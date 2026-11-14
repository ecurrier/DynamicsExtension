import { makeStyles, Text, tokens } from "@fluentui/react-components";

import { SearchField } from "../SearchField";

const useStyles = makeStyles({
	root: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 },
	count: { color: tokens.colorNeutralForeground3, whiteSpace: "nowrap", flexShrink: 0 },
});

interface TableFilterProps {
	query: string;
	onChange: (query: string) => void;
	shown: number;
	total: number;
	/** Name what is searched: "Search variables", never the bare word "Filter". */
	placeholder: string;
	label?: string;
}

export const TableFilter = ({ query, onChange, shown, total, placeholder, label }: TableFilterProps) => {
	const styles = useStyles();
	return (
		<div className={styles.root}>
			<SearchField value={query} onChange={onChange} placeholder={placeholder} aria-label={label ?? placeholder} clearLabel="Clear filter" />
			<Text size={200} className={styles.count}>
				{shown === total ? `${total}` : `${shown} of ${total}`}
			</Text>
		</div>
	);
};
