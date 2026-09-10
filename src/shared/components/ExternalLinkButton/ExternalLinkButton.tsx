import { Button } from "@fluentui/react-components";
import { Open20Regular } from "@fluentui/react-icons";
import { type ReactNode } from "react";

import { openUrl } from "@/shared/extension";

interface ExternalLinkButtonProps {
	url: string | null | undefined;
	children?: ReactNode;
	disabled?: boolean;
	appearance?: "primary" | "secondary" | "outline" | "subtle" | "transparent";
	size?: "small" | "medium" | "large";
}

export const ExternalLinkButton = ({ url, children = "Open", disabled, appearance = "secondary", size }: ExternalLinkButtonProps) => (
	<Button appearance={appearance} size={size} icon={<Open20Regular />} disabled={disabled || !url} onClick={() => url && void openUrl(url)}>
		{children}
	</Button>
);
