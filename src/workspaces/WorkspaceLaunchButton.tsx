import { Button, Menu, type MenuButtonProps, MenuItem, MenuList, MenuPopover, MenuTrigger, SplitButton } from "@fluentui/react-components";
import { FullScreenMaximize20Regular, Open20Regular } from "@fluentui/react-icons";

import { type WorkspaceTarget } from "@/shared/types";

const WINDOW_HINT = "Opens in this window. Use the arrow to open in a new tab instead.";

interface WorkspaceLaunchButtonProps {
	label: string;
	canOpenInWindow: boolean;
	disabled?: boolean;
	appearance?: "primary" | "secondary";
	size?: "small" | "medium";
	onOpen: (target: WorkspaceTarget) => void;
}

export const WorkspaceLaunchButton = ({
	label,
	canOpenInWindow,
	disabled = false,
	appearance = "secondary",
	size = "medium",
	onOpen,
}: WorkspaceLaunchButtonProps) => {
	if (!canOpenInWindow) {
		return (
			<Button appearance={appearance} size={size} icon={<Open20Regular />} disabled={disabled} onClick={() => onOpen("tab")}>
				{label}
			</Button>
		);
	}
	return (
		<Menu positioning="below-end">
			<MenuTrigger disableButtonEnhancement>
				{(triggerProps: MenuButtonProps) => (
					<SplitButton
						appearance={appearance}
						size={size}
						icon={<FullScreenMaximize20Regular />}
						disabled={disabled}
						menuButton={{ ...triggerProps, "aria-label": `${label} options` }}
						primaryActionButton={{ onClick: () => onOpen("window"), title: WINDOW_HINT }}>
						{label}
					</SplitButton>
				)}
			</MenuTrigger>
			<MenuPopover>
				<MenuList>
					<MenuItem icon={<FullScreenMaximize20Regular />} onClick={() => onOpen("window")}>
						Open in this window
					</MenuItem>
					<MenuItem icon={<Open20Regular />} onClick={() => onOpen("tab")}>
						Open in a new tab
					</MenuItem>
				</MenuList>
			</MenuPopover>
		</Menu>
	);
};
