import { type BadgeProps } from "@fluentui/react-components";

export type ChipColor = NonNullable<BadgeProps["color"]>;

export const PRIVILEGE_DEPTH_COLORS: Record<string, ChipColor> = {
	None: "subtle",
	User: "informative",
	BusinessUnit: "brand",
	ParentChild: "warning",
	Organization: "danger",
};

export const PRIVILEGE_ACCESS_COLORS: Record<string, ChipColor> = {
	Read: "informative",
	Create: "success",
	Write: "brand",
	Append: "subtle",
	AppendTo: "subtle",
	Assign: "warning",
	Share: "warning",
	Delete: "danger",
};

export const MANAGED_COLORS: Record<string, ChipColor> = {
	Managed: "informative",
	Unmanaged: "subtle",
};

export const chipColor = (palette: Record<string, ChipColor>, value: string): ChipColor => palette[value] ?? "subtle";
