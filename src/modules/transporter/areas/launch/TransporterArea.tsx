import { makeStyles, MessageBar, MessageBarBody, MessageBarTitle, Text, tokens } from "@fluentui/react-components";

import { usePageQuery } from "@/messaging/client";
import { useConnectableEnvironments } from "@/modules/settings";
import { AreaContainer, FormRow, FormStack, Grow } from "@/shared/components";
import { useAsyncAction } from "@/shared/hooks";
import { resolveOrgOrigin } from "@/shared/lib";
import { useSessionStore } from "@/shared/stores";
import { type WorkspaceTarget } from "@/shared/types";
import { useWorkspaceLauncher, WorkspaceLaunchButton } from "@/workspaces";

const useStyles = makeStyles({
	hint: {
		color: tokens.colorNeutralForeground3,
	},
});

const OPENS_IN_TAB = "The transporter opens in its own tab.";

const OPENS_IN_WINDOW = "The transporter fills this window, or opens in its own tab from the button menu.";

export const TransporterArea = () => {
	const styles = useStyles();
	const tabId = useSessionStore((state) => state.tabId);
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const pageContext = usePageQuery("global.getPageContext", undefined);
	const pageReady = tabId !== null && pageContext.data === "model-driven-app";
	const details = usePageQuery("settings.getEnvironmentDetails", undefined, { enabled: pageReady });
	const { environments } = useConnectableEnvironments();
	const workspaces = useWorkspaceLauncher();
	const launch = useAsyncAction("Could not open the Data Transporter");

	const open = (target: WorkspaceTarget) =>
		launch.run(async () => {
			const orgOrigin = pageReady ? resolveOrgOrigin(details.data?.modelDrivenAppUrl ?? null, tabUrl) : null;
			await workspaces.open(
				{
					id: "data-transporter",
					launch: {
						tabId: pageReady ? tabId : null,
						orgOrigin,
						environmentName: pageReady ? (details.data?.environmentName ?? orgOrigin) : null,
						launchedAt: new Date().toISOString(),
					},
				},
				target
			);
		});

	return (
		<AreaContainer>
			<FormStack>
				<MessageBar intent="info" layout="multiline">
					<MessageBarBody>
						<MessageBarTitle>Data Transporter</MessageBarTitle>
						Pick a source (this page or a saved environment) and a target environment, retrieve records with a view or FetchXML, review what would
						be created, updated, or deleted, then run it. Records are matched by primary key, so ids stay the same in both environments.{" "}
						{workspaces.canOpenInWindow ? OPENS_IN_WINDOW : OPENS_IN_TAB}
					</MessageBarBody>
				</MessageBar>
				<Text size={200} className={styles.hint}>
					{environments.length === 0
						? "No saved environment has a service principal yet, so there is nothing to write to. Add one under Settings first."
						: `${environments.length} saved environment${environments.length === 1 ? "" : "s"} can be used as the target.${pageReady ? " The page you have open can be the source." : ""}`}
				</Text>
				<FormRow>
					<Grow>
						<span />
					</Grow>
					<WorkspaceLaunchButton
						label={launch.running ? "Opening..." : "Open Data Transporter"}
						appearance="primary"
						canOpenInWindow={workspaces.canOpenInWindow}
						disabled={launch.running}
						onOpen={(target) => void open(target)}
					/>
				</FormRow>
			</FormStack>
		</AreaContainer>
	);
};
