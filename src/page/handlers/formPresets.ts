import { defineHandlers, PageError } from "@/messaging/page";
import { getFormContext } from "@/page/xrm";

const PORTAL_INPUT_SELECTOR = '.crmEntityFormView .control > .form-control:not([type="hidden"])';

type PortalInput = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isPortal = (): boolean => !window.Xrm && !!window.portal;

export const toPresetValue = (value: unknown): unknown => (value instanceof Date ? value.toISOString() : value);

const captureAppFormValues = (): Record<string, unknown> => {
	const values: Record<string, unknown> = {};
	getFormContext().data.entity.attributes.forEach((attribute) => {
		const value = toPresetValue(attribute.getValue() as unknown);
		if (value !== null && value !== undefined) {
			values[attribute.getName()] = value;
		}
	});
	return values;
};

const capturePortalFormValues = (): Record<string, unknown> => {
	const values: Record<string, unknown> = {};
	document.querySelectorAll<PortalInput>(PORTAL_INPUT_SELECTOR).forEach((input) => {
		if (input.id && input.value !== "") {
			values[input.id] = input.value;
		}
	});
	return values;
};

const applyAppFormValues = (fields: Record<string, unknown>) => {
	const formContext = getFormContext();
	const skipped: string[] = [];
	let applied = 0;
	for (const [key, rawValue] of Object.entries(fields)) {
		try {
			const attribute = formContext.getAttribute(key);
			if (!attribute) {
				skipped.push(key);
				continue;
			}
			const value = attribute.getAttributeType() === "datetime" && typeof rawValue === "string" ? new Date(rawValue) : rawValue;
			(attribute as unknown as { setValue(next: unknown): void }).setValue(value);
			applied += 1;
		} catch {
			skipped.push(key);
		}
	}
	return { applied, skipped };
};

const applyPortalFormValues = (fields: Record<string, unknown>) => {
	const skipped: string[] = [];
	let applied = 0;
	for (const [key, value] of Object.entries(fields)) {
		const input = document.getElementById(key) as PortalInput | null;
		if (!input || !("value" in input)) {
			skipped.push(key);
			continue;
		}
		input.value = value === null || value === undefined ? "" : String(value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
		applied += 1;
	}
	return { applied, skipped };
};

export const formPresetsHandlers = defineHandlers({
	"formPresets.captureFormValues": () => {
		if (isPortal()) {
			return capturePortalFormValues();
		}
		return captureAppFormValues();
	},
	"formPresets.applyFormValues": ({ fields }) => {
		if (isPortal()) {
			return applyPortalFormValues(fields);
		}
		if (!window.Xrm) {
			throw new PageError("NotSupported", "Templates can only be applied on model-driven app forms or Power Pages forms");
		}
		return applyAppFormValues(fields);
	},
});
