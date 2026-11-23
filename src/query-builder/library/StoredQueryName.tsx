import { makeStyles, Text, tokens, Tooltip } from "@fluentui/react-components";

import { useCurrentStoredQuery } from "./useCurrentStoredQuery";

const useStyles = makeStyles({
	root: {
		display: "flex",
		alignItems: "baseline",
		columnGap: tokens.spacingHorizontalXS,
		minWidth: 0,
		maxWidth: "240px",
		alignSelf: "center",
	},
	name: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		minWidth: 0,
	},
	changed: {
		flexShrink: 0,
		color: tokens.colorNeutralForeground3,
	},
});

export const StoredQueryName = () => {
	const styles = useStyles();
	const { storedQuery, changed } = useCurrentStoredQuery();
	if (!storedQuery) {
		return null;
	}
	return (
		<Tooltip
			content={changed ? `The Query has changes since you stored it as "${storedQuery.name}".` : `Stored Query "${storedQuery.name}"`}
			relationship="description">
			<div className={styles.root} role="status" tabIndex={0}>
				<Text weight="semibold" className={styles.name}>
					{storedQuery.name}
				</Text>
				{changed ? (
					<Text size={200} className={styles.changed}>
						changed
					</Text>
				) : null}
			</div>
		</Tooltip>
	);
};
