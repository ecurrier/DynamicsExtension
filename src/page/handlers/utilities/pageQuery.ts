import { getQueryParameter } from "@/shared/lib";

export const currentEntityName = (): string | null => getQueryParameter(window.location.search, "etn");

export const currentViewId = (): string | null => getQueryParameter(window.location.search, "viewid");

export const collapseWhitespace = (xml: string): string => xml.replace(/ {2,}|\n/g, "");

export const isGridControl = (control: Xrm.Controls.Control): control is Xrm.Controls.GridControl => control.getControlType() === "subgrid";

export const isLookupControl = (control: Xrm.Controls.Control): control is Xrm.Controls.LookupControl => control.getControlType() === "lookup";

export const hasFetchXml = (control: Xrm.Controls.Control): control is Xrm.Controls.GridControl =>
	typeof (control as Partial<Xrm.Controls.GridControl>).getFetchXml === "function";

export const listPageControls = (): Xrm.Controls.Control[] => {
	const page = window.Xrm?.Page as Xrm.Page | undefined;
	const controls = page?.ui?.controls;
	if (!controls?.forEach) {
		return [];
	}
	const collected: Xrm.Controls.Control[] = [];
	controls.forEach((control) => collected.push(control));
	return collected;
};
