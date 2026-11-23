import { Badge, Caption1, Caption1Strong, makeStyles, mergeClasses, tokens } from "@fluentui/react-components";

import { type QueryView } from "@/shared/types";

import { needsPlaceholderNote, viewTypeLabel } from "../lib";
import { PickItem, PickList } from "./PickList";

const useStyles = makeStyles({
	group: {
		display: "flex",
		flexDirection: "column",
		rowGap: tokens.spacingVerticalXS,
		margin: 0,
		padding: 0,
	},
	heading: {
		color: tokens.colorNeutralForeground2,
	},
	line: {
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		columnGap: tokens.spacingHorizontalS,
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
	warning: {
		color: tokens.colorPaletteMarigoldForeground2,
	},
});

interface ViewGroupProps {
	title: string;
	views: readonly QueryView[];
	empty: string;
	warning?: boolean;
	onPick: (view: QueryView) => void;
}

export const ViewGroup = ({ title, views, empty, warning = false, onPick }: ViewGroupProps) => {
	const styles = useStyles();
	return (
		<section className={styles.group} aria-label={title}>
			<Caption1Strong className={styles.heading}>{views.length > 0 ? `${title} · ${views.length}` : title}</Caption1Strong>
			{views.length === 0 ? (
				<Caption1 className={mergeClasses(styles.muted, warning && styles.warning)}>{empty}</Caption1>
			) : (
				<PickList>
					{views.map((view) => {
						const type = viewTypeLabel(view.queryType);
						return (
							<PickItem key={view.id} onPick={() => onPick(view)}>
								<span className={styles.line}>
									{view.name}
									{view.isDefault ? (
										<Badge size="small" appearance="tint" color="brand">
											Default
										</Badge>
									) : null}
									{type ? (
										<Badge size="small" appearance="outline" color="informative">
											{type}
										</Badge>
									) : null}
								</span>
								{needsPlaceholderNote(view) ? (
									<Caption1 className={styles.muted}>The Fetch XML has {"{0}"} placeholders. Replace them before you run the Query.</Caption1>
								) : null}
							</PickItem>
						);
					})}
				</PickList>
			)}
		</section>
	);
};
