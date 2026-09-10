import { defineHandlers, PageError } from "@/messaging/page";
import { getFormContext, getXrm } from "@/page/xrm";
import { normalizeGuid } from "@/shared/lib";
import { type AdminModeResult, type CapturedControlState, type FormStateSnapshot, type RestoreFormStateResult } from "@/shared/types";

const hasLabelApi = (control: Xrm.Controls.Control): control is Xrm.Controls.Control & Xrm.Controls.UiLabelElement =>
	"setLabel" in control && "getLabel" in control;

const captureControlState = (formContext: Xrm.Page): CapturedControlState[] =>
	formContext.ui.controls.get().map<CapturedControlState>((control) => {
		const candidate = control as Partial<Xrm.Controls.StandardControl>;
		return {
			name: control.getName(),
			label: candidate.getLabel?.() ?? control.getName(),
			visible: candidate.getVisible?.() ?? true,
			disabled: candidate.getDisabled?.() ?? false,
			requiredLevel: candidate.getAttribute?.()?.getRequiredLevel?.() ?? "none",
		};
	});

const formIdOf = (formContext: Xrm.Page): string | null => {
	const currentForm = formContext.ui.formSelector.getCurrentItem();
	return currentForm ? normalizeGuid(currentForm.getId()) : null;
};

const captureSnapshot = (formContext: Xrm.Page): FormStateSnapshot => ({
	entityLogicalName: formContext.data.entity.getEntityName(),
	formId: formIdOf(formContext),
	controls: captureControlState(formContext),
});

const relaxForm = (formContext: Xrm.Page): void => {
	formContext.data.entity.attributes.forEach((attribute) => attribute.setRequiredLevel("none"));
	formContext.ui.controls.forEach((control) => {
		const candidate = control as Partial<Xrm.Controls.StandardControl>;
		candidate.setVisible?.(true);
		candidate.setDisabled?.(false);
		candidate.clearNotification?.();
	});
	const selectedTab = formContext.ui.tabs.get((tab) => tab.getDisplayState() === "expanded")[0];
	formContext.ui.tabs.forEach((tab) => {
		tab.setVisible(true);
		tab.setDisplayState("expanded");
		tab.sections.forEach((section) => section.setVisible(true));
	});
	selectedTab?.setDisplayState("expanded");
	selectedTab?.setFocus();
};

export const formStateHandlers = defineHandlers({
	"utilities.refreshCommandBar": () => {
		const page = getXrm().Page as Xrm.Page | undefined;
		if (!page?.ui?.refreshRibbon) {
			throw new PageError("NotSupported", "The command bar cannot be refreshed on this page");
		}
		page.ui.refreshRibbon();
	},
	"utilities.toggleControlLogicalNames": () => {
		const controls = getFormContext()
			.getControl()
			.filter(hasLabelApi)
			.filter((control) => !!control.controlDescriptor?.Name && !!(control.controlDescriptor?.Label ?? control._defaultLabel));
		const first = controls[0];
		if (!first) {
			throw new PageError("NotFound", "Could not find any labelled controls on the form");
		}
		const showLogicalNames = first.getLabel() === (first.controlDescriptor?.Label ?? first._defaultLabel);
		controls.forEach((control) => {
			const logicalName = control.controlDescriptor?.Name ?? "";
			const label = control.controlDescriptor?.Label ?? control._defaultLabel ?? "";
			control.setLabel(showLogicalNames ? logicalName : label);
		});
		return { mode: showLogicalNames ? "logical" : "label" } as const;
	},
	"utilities.enableAdminMode": (): AdminModeResult => {
		const formContext = getFormContext();
		const snapshot = captureSnapshot(formContext);
		relaxForm(formContext);
		return {
			total: snapshot.controls.length,
			hidden: snapshot.controls.filter((control) => !control.visible),
			disabled: snapshot.controls.filter((control) => control.disabled),
			required: snapshot.controls.filter((control) => control.requiredLevel === "required"),
			snapshot,
		};
	},
	"utilities.restoreFormState": ({ snapshot }): RestoreFormStateResult => {
		const formContext = getFormContext();
		const current = captureSnapshot(formContext);
		if (snapshot.entityLogicalName !== current.entityLogicalName || snapshot.formId !== current.formId) {
			throw new PageError("InvalidArgument", "The saved form state was captured on a different form. Re-run admin mode on this form before restoring.");
		}
		const byName = new Map(snapshot.controls.map((control) => [control.name, control]));
		let restored = 0;
		formContext.ui.controls.forEach((control) => {
			const previous = byName.get(control.getName());
			if (!previous) {
				return;
			}
			const candidate = control as Partial<Xrm.Controls.StandardControl>;
			candidate.setVisible?.(previous.visible);
			candidate.setDisabled?.(previous.disabled);
			candidate.getAttribute?.()?.setRequiredLevel?.(previous.requiredLevel as Xrm.Attributes.RequirementLevel);
			restored += 1;
		});
		return { restored };
	},
});
