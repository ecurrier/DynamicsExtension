import { Hamburger, makeStyles, Text, tokens, Toolbar, ToolbarButton, Tooltip } from "@fluentui/react-components";
import { ArrowClockwise20Regular, ArrowLeft20Regular, PanelRightExpand20Regular, Pin20Regular, TabDesktop20Regular } from "@fluentui/react-icons";
import { type ReactNode } from "react";

import { AreaBreadcrumb, type BreadcrumbArea } from "../AreaBreadcrumb";
import { LoadingBar } from "../Loading";

const useStyles = makeStyles({
	root: {
		display: "grid",
		gridTemplateRows: "auto auto auto 1fr",
		height: "100%",
		backgroundColor: tokens.colorNeutralBackground2,
	},
	header: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		paddingRight: "8px",
		backgroundColor: tokens.colorNeutralBackground1,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	breadcrumb: {
		flex: 1,
		minWidth: 0,
	},
	title: {
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
	return (
		<div className={styles.root}>
			<div className={styles.header}>
				<Toolbar>
					<Tooltip content="Navigation" relationship="label">
						<Hamburger onClick={onOpenNav} />
					</Tooltip>
					{onBack ? (
						<Tooltip content={backLabel} relationship="label">
							<ToolbarButton icon={<ArrowLeft20Regular />} onClick={onBack} aria-label={backLabel} />
						</Tooltip>
					) : null}
				</Toolbar>
				<div className={styles.breadcrumb}>
					<AreaBreadcrumb path={breadcrumb} tooltip={tooltip} areas={moduleAreas} currentAreaId={currentAreaId} onNavigate={onNavigateArea} />
				</div>
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
			<LoadingBar />
			<div>{banner ? <div className={styles.banner}>{banner}</div> : null}</div>
			<div className={styles.content}>{children}</div>
		</div>
	);
};
