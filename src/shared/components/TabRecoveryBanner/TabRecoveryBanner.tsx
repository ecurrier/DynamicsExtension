import {
	Button,
	Menu,
	MenuItem,
	MenuList,
	MenuPopover,
	MenuTrigger,
	MessageBar,
	MessageBarActions,
	MessageBarBody,
	MessageBarTitle,
} from "@fluentui/react-components";
import { ArrowSync20Regular, TabDesktop20Regular } from "@fluentui/react-icons";

export interface TabRecoveryChoice {
	id: number;
	label: string;
}

export type TabRecoveryVariant = "lost" | "unbound";

interface TabRecoveryBannerProps {
	variant: TabRecoveryVariant;
	choices: TabRecoveryChoice[];
	busy?: boolean;
	onPick: (tabId: number) => void;
	onRefresh: () => void;
}

const TITLES: Record<TabRecoveryVariant, string> = {
	lost: "Power Tools lost its tab",
	unbound: "No Dynamics tab connected",
};

const DESCRIPTIONS: Record<TabRecoveryVariant, string> = {
	lost: "The tab this window was following has closed. Pick another tab to carry on in.",
	unbound: "Power Tools reads the page you have open. Pick a Dynamics tab to work in.",
};

const NOTHING_OPEN = "No Dynamics tab is open. Open a model-driven app or a Power Pages site, then check again.";

export const TabRecoveryBanner = ({ variant, choices, busy = false, onPick, onRefresh }: TabRecoveryBannerProps) => (
	<MessageBar intent="warning" layout="multiline">
		<MessageBarBody>
			<MessageBarTitle>{TITLES[variant]}</MessageBarTitle>
			{choices.length === 0 ? NOTHING_OPEN : DESCRIPTIONS[variant]}
		</MessageBarBody>
		<MessageBarActions>
			{choices.length > 0 && (
				<Menu positioning="below-end">
					<MenuTrigger disableButtonEnhancement>
						<Button appearance="primary" icon={<TabDesktop20Regular />} disabled={busy}>
							Pick a tab
						</Button>
					</MenuTrigger>
					<MenuPopover>
						<MenuList>
							{choices.map((choice) => (
								<MenuItem key={choice.id} onClick={() => onPick(choice.id)}>
									{choice.label}
								</MenuItem>
							))}
						</MenuList>
					</MenuPopover>
				</Menu>
			)}
			<Button appearance="transparent" icon={<ArrowSync20Regular />} disabled={busy} onClick={onRefresh}>
				Check again
			</Button>
		</MessageBarActions>
	</MessageBar>
);
