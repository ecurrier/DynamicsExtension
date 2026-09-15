import { Badge } from "@fluentui/react-components";

import { type ChipColor, chipColor } from "./palettes";

interface ValueChipProps {
	value: string;
	palette: Record<string, ChipColor>;
	title?: string;
}

export const ValueChip = ({ value, palette, title }: ValueChipProps) =>
	value === "" ? null : (
		<Badge appearance="tint" size="small" color={chipColor(palette, value)} title={title}>
			{value}
		</Badge>
	);
