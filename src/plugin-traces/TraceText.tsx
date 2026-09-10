import { makeStyles, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, mergeClasses, Text, tokens } from "@fluentui/react-components";
import { Copy20Regular, Filter20Regular, Highlight20Regular } from "@fluentui/react-icons";

import { useAppToast } from "@/shared/components";
import { copyToClipboard } from "@/shared/lib";

import { splitGuids } from "./lib";

const useStyles = makeStyles({
	pre: {
		margin: 0,
		padding: "12px",
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
		lineHeight: tokens.lineHeightBase300,
		whiteSpace: "pre-wrap",
		wordBreak: "break-word",
		backgroundColor: tokens.colorNeutralBackground1,
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
	},
	chip: {
		border: "none",
		margin: 0,
		cursor: "pointer",
		fontFamily: "inherit",
		fontSize: "inherit",
		lineHeight: "inherit",
		padding: "0 3px",
		borderRadius: tokens.borderRadiusSmall,
		backgroundColor: tokens.colorNeutralBackground3,
		color: tokens.colorBrandForeground1,
		":hover": {
			backgroundColor: tokens.colorNeutralBackground3Hover,
		},
	},
	chipActive: {
		backgroundColor: tokens.colorPaletteYellowBackground2,
		color: tokens.colorNeutralForeground1,
		fontWeight: tokens.fontWeightSemibold,
	},
	empty: {
		display: "block",
		padding: "12px",
		color: tokens.colorNeutralForeground3,
	},
});

export interface GuidActions {
	highlightedGuid: string | null;
	correlationIds: Set<string>;
	onHighlight: (guid: string | null) => void;
	onShowCorrelation: (correlationId: string) => void;
}

interface GuidChipProps extends GuidActions {
	guid: string;
}

export const GuidChip = ({ guid, highlightedGuid, correlationIds, onHighlight, onShowCorrelation }: GuidChipProps) => {
	const styles = useStyles();
	const toast = useAppToast();
	const highlighted = highlightedGuid === guid;
	const copy = async () => {
		try {
			await copyToClipboard(guid);
			toast.success("Id copied to clipboard");
		} catch (error) {
			toast.error("Copy failed", error);
		}
	};
	return (
		<Menu>
			<MenuTrigger disableButtonEnhancement>
				<button type="button" className={mergeClasses(styles.chip, highlighted && styles.chipActive)} title={guid}>
					{guid}
				</button>
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<MenuItem icon={<Copy20Regular />} onClick={() => void copy()}>
						Copy id
					</MenuItem>
					<MenuItem icon={<Highlight20Regular />} onClick={() => onHighlight(highlighted ? null : guid)}>
						{highlighted ? "Clear highlight" : "Highlight everywhere"}
					</MenuItem>
					<MenuItem icon={<Filter20Regular />} disabled={!correlationIds.has(guid)} onClick={() => onShowCorrelation(guid)}>
						Show correlation
					</MenuItem>
				</MenuList>
			</MenuPopover>
		</Menu>
	);
};

interface TraceTextProps extends GuidActions {
	text: string | null;
	emptyLabel?: string;
}

export const TraceText = ({ text, emptyLabel = "Nothing recorded", ...actions }: TraceTextProps) => {
	const styles = useStyles();
	if (!text) {
		return (
			<Text size={200} className={styles.empty}>
				{emptyLabel}
			</Text>
		);
	}
	return (
		<pre className={styles.pre}>
			{splitGuids(text).map((segment, index) => (segment.kind === "text" ? segment.value : <GuidChip key={index} guid={segment.value} {...actions} />))}
		</pre>
	);
};
