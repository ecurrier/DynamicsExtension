import { Button, Card, makeStyles, Text, tokens } from "@fluentui/react-components";
import { FullScreenMaximize20Regular, Open20Regular } from "@fluentui/react-icons";
import { type ReactNode } from "react";

import { type AreaDefinition } from "@/modules/types";
import { openPinnedWindow } from "@/shared/extension";
import { useAsyncAction, usePopupLaunch } from "@/shared/hooks";
import { useSessionStore } from "@/shared/stores";
import { useAreaLauncher } from "@/workspaces";

const useStyles = makeStyles({
	card: {
		margin: "16px",
		padding: "16px",
		display: "flex",
		flexDirection: "column",
		alignItems: "flex-start",
		gap: "12px",
	},
	reason: {
		color: tokens.colorNeutralForeground3,
	},
});

interface SurfaceFitGateProps {
	area: AreaDefinition;
	children: ReactNode;
}

/**
 * Keeps an Area off a Surface that is too narrow for it, and offers the Surface that fits. A
 * `fit: "workspace"` Area has no component of its own: this card is what the user lands on when
 * the Workspace was opened in a tab, or when the Area is restored from a remembered session.
 */
export const SurfaceFitGate = ({ area, children }: SurfaceFitGateProps) => {
	const styles = useStyles();
	const mode = usePopupLaunch().mode;
	const tabId = useSessionStore((state) => state.tabId);
	const launcher = useAreaLauncher();
	const open = useAsyncAction(`Could not open ${area.label}`);
	const pin = useAsyncAction("Could not open Power Tools in a window");

	if (area.fit === "workspace" && area.workspace) {
		const target = area.workspace;
		return (
			<Card className={styles.card}>
				<Text weight="semibold">{area.label} fills a full page</Text>
				<Text size={200} className={styles.reason}>
					{launcher.canOpenInWindow
						? "It opens in this window, so there is more room for its tables and panels."
						: "It opens in its own browser tab, so there is more room for its tables and panels. Keep this tab open while you work."}
				</Text>
				<Button
					appearance="primary"
					icon={launcher.canOpenInWindow ? <FullScreenMaximize20Regular /> : <Open20Regular />}
					disabled={open.running}
					onClick={() => void open.run(() => launcher.open(target))}>
					{open.running ? "Opening..." : `Open ${area.label}`}
				</Button>
			</Card>
		);
	}

	if (area.fit === "window" && mode === "sidepanel") {
		return (
			<Card className={styles.card}>
				<Text weight="semibold">{area.label} needs more width</Text>
				<Text size={200} className={styles.reason}>
					The side panel is too narrow to read this Area. Open Power Tools in a window, which stays open while you work.
				</Text>
				<Button
					appearance="primary"
					icon={<FullScreenMaximize20Regular />}
					disabled={pin.running || tabId === null}
					onClick={() => void pin.run(() => openPinnedWindow(tabId as number))}>
					{pin.running ? "Opening..." : "Open in a window"}
				</Button>
			</Card>
		);
	}

	return <>{children}</>;
};
