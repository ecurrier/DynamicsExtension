import { TextBadge } from "../TextBadge";
import { type ChipColor, chipColor } from "./palettes";

interface ValueChipProps {
	value: string;
	palette: Record<string, ChipColor>;
}

export const ValueChip = ({ value, palette }: ValueChipProps) =>
	value === "" ? null : (
		<TextBadge appearance="tint" size="small" color={chipColor(palette, value)}>
			{value}
		</TextBadge>
	);
