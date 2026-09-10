import { Tooltip } from "@fluentui/react-components";
import { Info16Regular } from "@fluentui/react-icons";

interface InfoTipProps {
	content: string;
}

export const InfoTip = ({ content }: InfoTipProps) => (
	<Tooltip content={content} relationship="description">
		<Info16Regular aria-label="More information" style={{ verticalAlign: "middle", marginLeft: "4px", cursor: "help" }} />
	</Tooltip>
);
