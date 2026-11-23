import { makeStyles, Text, tokens } from "@fluentui/react-components";

import { StepExplainer } from "@/shared/components";

import { QueryLibrary } from "./library";
import { QUERY_BUILDER_STEPS, StartingPointCards } from "./start";

const useStyles = makeStyles({
	root: {
		display: "flex",
		justifyContent: "center",
		flexGrow: 1,
		minHeight: 0,
		overflowY: "auto",
		padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXL}`,
	},
	column: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXXL,
		width: "100%",
		maxWidth: "760px",
		height: "max-content",
	},
	section: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalM,
	},
	heading: {
		margin: 0,
	},
});

export const EmptyStart = () => {
	const styles = useStyles();
	return (
		<div className={styles.root}>
			<div className={styles.column}>
				<StepExplainer steps={QUERY_BUILDER_STEPS} />
				<section className={styles.section} aria-labelledby="query-builder-start-heading">
					<Text as="h2" id="query-builder-start-heading" size={500} weight="semibold" className={styles.heading}>
						Start a Query
					</Text>
					<StartingPointCards />
				</section>
				<QueryLibrary />
			</div>
		</div>
	);
};
