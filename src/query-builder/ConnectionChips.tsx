import { Button, makeStyles, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Tag, TagGroup, tokens, Tooltip } from "@fluentui/react-components";
import { Add20Regular } from "@fluentui/react-icons";

import { type ConnectionTarget } from "@/shared/connections";

import { type AddableConnection } from "./lib";

const WIDE_LABELS = "@container (max-width: 1279px)";
const NARROW_CHIPS = "@container (max-width: 1099px)";

const useStyles = makeStyles({
	root: {
		display: "flex",
		alignItems: "center",
		flexShrink: 0,
		columnGap: tokens.spacingHorizontalXS,
	},
	tags: {
		display: "flex",
		flexWrap: "nowrap",
		columnGap: tokens.spacingHorizontalXS,
	},
	tag: {
		flexShrink: 0,
	},
	tagText: {
		display: "block",
		maxWidth: "160px",
		overflow: "hidden",
		whiteSpace: "nowrap",
		textOverflow: "ellipsis",
		[NARROW_CHIPS]: {
			maxWidth: "72px",
		},
	},
	add: {
		flexShrink: 0,
		[WIDE_LABELS]: {
			minWidth: "auto",
		},
	},
	addLabel: {
		[WIDE_LABELS]: {
			display: "none",
		},
	},
});

export interface AddedConnection {
	key: string;
	name: string;
}

interface ConnectionChipsProps {
	added: readonly AddedConnection[];
	addable: readonly AddableConnection[];
	disabled: boolean;
	onAdd: (connection: ConnectionTarget) => void;
	onRemove: (key: string) => void;
}

export const ConnectionChips = ({ added, addable, disabled, onAdd, onRemove }: ConnectionChipsProps) => {
	const styles = useStyles();
	const none = addable.length === 0;
	return (
		<div className={styles.root} role="group" aria-label="More Connections">
			{added.length > 0 ? (
				<TagGroup className={styles.tags} disabled={disabled} aria-label="Added Connections" onDismiss={(_, data) => onRemove(String(data.value))}>
					{added.map(({ key, name }) => (
						<Tooltip key={key} content={name} relationship="description">
							<Tag value={key} dismissible className={styles.tag} dismissIcon={{ "aria-label": `Remove ${name}` }}>
								<span className={styles.tagText}>{name}</span>
							</Tag>
						</Tooltip>
					))}
				</TagGroup>
			) : null}
			<Menu>
				<MenuTrigger disableButtonEnhancement>
					<Tooltip
						content={
							none
								? "No other Connection is available. An Environment needs a Service Principal to be a Connection."
								: "Run the Query on one more Connection"
						}
						relationship="description">
						<Button
							appearance="subtle"
							icon={<Add20Regular />}
							className={styles.add}
							disabledFocusable={disabled || none}
							aria-label="Add Connection">
							<span className={styles.addLabel}>Add Connection</span>
						</Button>
					</Tooltip>
				</MenuTrigger>
				<MenuPopover>
					<MenuList>
						{addable.map((option) => (
							<MenuItem key={option.key} onClick={() => onAdd(option.connection)}>
								{option.name}
							</MenuItem>
						))}
					</MenuList>
				</MenuPopover>
			</Menu>
		</div>
	);
};
