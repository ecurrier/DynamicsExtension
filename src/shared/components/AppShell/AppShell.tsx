import { Hamburger, makeStyles, Text, tokens, Toolbar, ToolbarButton, Tooltip } from "@fluentui/react-components";
import {
	ArrowClockwise20Regular,
	ArrowLeft20Regular,
	Open20Regular,
	PanelRightExpand20Regular,
	Pin20Regular,
	TabDesktop20Regular,
} from "@fluentui/react-icons";
import { type ReactNode, useState } from "react";

import { NAV_SEARCH_KEYSHORTCUTS, NAV_SEARCH_SHORTCUT } from "../AppNavDrawer";
import { AreaBreadcrumb, type BreadcrumbArea } from "../AreaBreadcrumb";
import { AreaShellSlotContext } from "../AreaShell";
import { LoadingBar } from "../Loading";

const useStyles = makeStyles({
	root: {
		display: "grid",
		gridTemplateRows: "auto auto auto 1fr",
		gridTemplateColumns: "minmax(0, 1fr)",
		height: "100%",
		backgroundColor: tokens.colorNeutralBackground2,
	},
	bar: {
		containerType: "inline-size",
		backgroundColor: tokens.colorNeutralBackground1,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	header: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		paddingRight: "8px",
		// Below the breakpoint the Area slots take a line of their own, after the shell buttons.
		"@container (max-width: 560px)": {
			flexWrap: "wrap",
		},
		"@container (max-width: 480px)": {
			gap: "4px",
			paddingRight: "4px",
		},
	},
	toolbar: {
		flexShrink: 0,
		"@container (max-width: 480px)": {
			paddingLeft: "4px",
			paddingRight: 0,
		},
	},
	breadcrumb: {
		// Sized by its content and truncated when the row is tight: the slots come first.
		flex: "0 1 auto",
		minWidth: 0,
	},
	// Holds the right-hand buttons against the edge, above all when the Area fills no slot.
	spacer: {
		flex: "1 1 0",
	},
	// The row an AreaShell renders into. It disappears when the Area puts nothing in it, so an
	// Area with no toolbar costs no height and leaves the breadcrumb the whole row.
	areaSlots: {
		display: "flex",
		alignItems: "center",
		flexWrap: "nowrap",
		"@container (max-width: 560px)": {
			flexBasis: "100%",
			order: 1,
			paddingBottom: "8px",
			minWidth: 0,
		},
		flex: "100 1 300px",
		// A floor, so the pressure falls on the breadcrumb, which truncates, instead of on the
		// search field, which has nowhere to go.
		minWidth: "320px",
		gap: "8px",
		rowGap: "4px",
		paddingBlock: "4px",
		":empty": {
			display: "none",
		},
	},
	title: {
		flex: "0 1 auto",
		minWidth: 0,
		maxWidth: "35%",
		// Dropped first, while the search field is still inline, and it leaves at 760px so there is
		// a width where the name is gone and the row is still one line.
		"@container (max-width: 760px)": {
			display: "none",
		},
		overflow: "hidden",
		textOverflow: "ellipsis",
		color: tokens.colorNeutralForeground3,
		whiteSpace: "nowrap",
	},
	banner: {
		padding: "12px 16px 0",
	},
	content: {
		overflow: "auto",
		minHeight: 0,
	},
});

interface AppShellProps {
	breadcrumb: string[];
	tooltip?: string;
	moduleAreas?: BreadcrumbArea[];
	currentAreaId?: string;
	onNavigateArea?: (areaId: string) => void;
	onOpenNav: () => void;
	onBack?: () => void;
	backLabel?: string;
	/** Beside the back control, for a Workspace open in this window. */
	onOpenInTab?: () => void;
	onRefresh: () => void;
	onPin?: () => void;
	onOpenSidePanel?: () => void;
	onFocusTab?: () => void;
	focusTabTooltip?: string;
	focusTabDisabled?: boolean;
	environmentName?: string | null;
	actions?: ReactNode;
	banner?: ReactNode;
	children: ReactNode;
}

export const AppShell = ({
	breadcrumb,
	tooltip,
	moduleAreas,
	currentAreaId,
	onNavigateArea,
	onOpenNav,
	onBack,
	backLabel = "Back",
	onOpenInTab,
	onRefresh,
	onPin,
	onOpenSidePanel,
	onFocusTab,
	focusTabTooltip = "Go to the tab Power Tools is reading",
	focusTabDisabled = false,
	environmentName,
	actions,
	banner,
	children,
}: AppShellProps) => {
	const styles = useStyles();
	const [areaSlot, setAreaSlot] = useState<HTMLElement | null>(null);
	return (
		<div className={styles.root}>
			<div className={styles.bar}>
				<div className={styles.header}>
					<Toolbar className={styles.toolbar}>
						<Tooltip content={`Navigation (${NAV_SEARCH_SHORTCUT})`} relationship="label">
							<Hamburger onClick={onOpenNav} aria-keyshortcuts={NAV_SEARCH_KEYSHORTCUTS} />
						</Tooltip>
						{onBack ? (
							<Tooltip content={backLabel} relationship="label">
								<ToolbarButton icon={<ArrowLeft20Regular />} onClick={onBack} aria-label={backLabel} />
							</Tooltip>
						) : null}
						{onOpenInTab ? (
							<Tooltip content="Open this tool in a browser tab" relationship="label">
								<ToolbarButton icon={<Open20Regular />} onClick={onOpenInTab} aria-label="Open this tool in a browser tab" />
							</Tooltip>
						) : null}
					</Toolbar>
					<div className={styles.breadcrumb}>
						<AreaBreadcrumb path={breadcrumb} tooltip={tooltip} areas={moduleAreas} currentAreaId={currentAreaId} onNavigate={onNavigateArea} />
					</div>
					<div className={styles.areaSlots} ref={setAreaSlot} />
					<div className={styles.spacer} />
					{actions}
					{environmentName ? (
						<Text size={200} className={styles.title} title={environmentName}>
							{environmentName}
						</Text>
					) : null}
					{onFocusTab ? (
						<Tooltip content={focusTabTooltip} relationship="label">
							<ToolbarButton icon={<TabDesktop20Regular />} onClick={onFocusTab} disabled={focusTabDisabled} aria-label={focusTabTooltip} />
						</Tooltip>
					) : null}
					{onOpenSidePanel ? (
						<Tooltip content="Dock Power Tools in the browser side panel" relationship="label">
							<ToolbarButton icon={<PanelRightExpand20Regular />} onClick={onOpenSidePanel} aria-label="Open in the side panel" />
						</Tooltip>
					) : null}
					{onPin ? (
						<Tooltip content="Open in a window that stays open when you click away" relationship="label">
							<ToolbarButton icon={<Pin20Regular />} onClick={onPin} aria-label="Open in a window" />
						</Tooltip>
					) : null}
					<Tooltip content="Refresh page data" relationship="label">
						<ToolbarButton icon={<ArrowClockwise20Regular />} onClick={onRefresh} aria-label="Refresh page data" />
					</Tooltip>
				</div>
			</div>
			<LoadingBar />
			<div>{banner ? <div className={styles.banner}>{banner}</div> : null}</div>
			<div className={styles.content}>
				<AreaShellSlotContext.Provider value={areaSlot}>{children}</AreaShellSlotContext.Provider>
			</div>
		</div>
	);
};
