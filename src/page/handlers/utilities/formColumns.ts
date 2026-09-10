import { defineHandlers } from "@/messaging/page";
import { getFormContext } from "@/page/xrm";
import { type FormAttributeInfo, type FormColumnDetails, type FormControlInfo } from "@/shared/types";

const FLASH_MS = 3000;
const FLASH_OUTLINE = "3px solid #0f6cbd";

type ParentedControl = Xrm.Controls.Control & Partial<Xrm.Controls.StandardControl>;

const parentsOf = (control: ParentedControl) => {
	const section = control.getParent?.() ?? null;
	const tab = section?.getParent?.() ?? null;
	return { section, tab };
};

const describeControl = (control: Xrm.Controls.Control): FormControlInfo => {
	const candidate = control as ParentedControl;
	const { section, tab } = parentsOf(candidate);
	return {
		name: control.getName(),
		label: candidate.getLabel?.() ?? control.getName(),
		controlType: control.getControlType(),
		tab: tab?.getLabel?.() ?? null,
		section: section?.getLabel?.() ?? null,
		visible: candidate.getVisible?.() ?? true,
		disabled: candidate.getDisabled?.() ?? false,
	};
};

const valueText = (attribute: Xrm.Attributes.Attribute): string | null => {
	const value = attribute.getValue() as unknown;
	if (value === null || value === undefined || value === "") {
		return null;
	}
	if (Array.isArray(value)) {
		return value.map((item: { name?: string; id?: string }) => item.name ?? item.id ?? "").join(", ");
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	const text = (attribute as Partial<Xrm.Attributes.OptionSetAttribute>).getText?.();
	return typeof text === "string" && text ? `${text} (${String(value)})` : String(value);
};

const flash = (name: string): void => {
	const element = document.querySelector<HTMLElement>(`[data-id="${name}"]`) ?? document.querySelector<HTMLElement>(`[data-id^="${name}."]`);
	if (!element) {
		return;
	}
	element.scrollIntoView({ block: "center", behavior: "smooth" });
	const previous = { outline: element.style.outline, offset: element.style.outlineOffset };
	element.style.outline = FLASH_OUTLINE;
	element.style.outlineOffset = "2px";
	window.setTimeout(() => {
		element.style.outline = previous.outline;
		element.style.outlineOffset = previous.offset;
	}, FLASH_MS);
};

const reveal = (control: ParentedControl, show: boolean): void => {
	const { section, tab } = parentsOf(control);
	if (show) {
		tab?.setVisible(true);
		section?.setVisible(true);
		control.setVisible?.(true);
	}
	tab?.setDisplayState("expanded");
	tab?.setFocus();
	control.setFocus?.();
	flash(control.getName());
};

export const formColumnsHandlers = defineHandlers({
	"utilities.getFormAttributes": (): FormAttributeInfo[] =>
		getFormContext()
			.data.entity.attributes.get()
			.map((attribute) => {
				const controls = attribute.controls.get().map(describeControl);
				return {
					logicalName: attribute.getName(),
					displayName: controls[0]?.label ?? attribute.getName(),
					attributeType: attribute.getAttributeType(),
					controls,
				};
			})
			.sort((left, right) => left.logicalName.localeCompare(right.logicalName)),
	"utilities.revealFormColumn": ({ logicalName, show }): FormColumnDetails => {
		const attribute = getFormContext().getAttribute(logicalName) as Xrm.Attributes.Attribute | null;
		if (!attribute) {
			return {
				logicalName,
				displayName: logicalName,
				attributeType: "",
				requiredLevel: "none",
				value: null,
				onForm: false,
				controls: [],
			};
		}
		const controls = attribute.controls.get();
		const first = controls[0] as ParentedControl | undefined;
		if (first) {
			reveal(first, show);
		}
		return {
			logicalName: attribute.getName(),
			displayName: first?.getLabel?.() ?? attribute.getName(),
			attributeType: attribute.getAttributeType(),
			requiredLevel: attribute.getRequiredLevel(),
			value: valueText(attribute),
			onForm: controls.length > 0,
			controls: controls.map(describeControl),
		};
	},
});
