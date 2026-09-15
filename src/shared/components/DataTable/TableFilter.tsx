import { Button, Input, makeStyles, Text, tokens } from "@fluentui/react-components";
import { DismissRegular, Search20Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
	root: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 },
	input: { flex: 1, minWidth: "120px" },
	count: { color: tokens.colorNeutralForeground3, whiteSpace: "nowrap" },
});

interface TableFilterProps {
	query: string;
	onChange: (query: string) => void;
	shown: number;
	total: number;
	placeholder?: string;
}

export const TableFilter = ({ query, onChange, shown, total, placeholder = "Filter" }: TableFilterProps) => {
	const styles = useStyles();
	return (
		<div className={styles.root}>
			<Input
				className={styles.input}
				size="small"
				value={query}
				placeholder={placeholder}
				contentBefore={<Search20Regular />}
				contentAfter={
					query ? (
						<Button appearance="transparent" size="small" icon={<DismissRegular />} aria-label="Clear filter" onClick={() => onChange("")} />
					) : undefined
				}
				onChange={(_, data) => onChange(data.value)}
			/>
			<Text size={200} className={styles.count}>
				{shown === total ? `${total}` : `${shown} of ${total}`}
			</Text>
		</div>
	);
};
