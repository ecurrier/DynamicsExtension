import { defineHandlers, PageError } from "@/messaging/page";
import { getEntityId, getFormContext, getPageKind, getXrm, requireModelDrivenApp } from "@/page/xrm";
import { normalizeGuid } from "@/shared/lib";
import { type ControlDetails, type PageTarget } from "@/shared/types";

import { currentEntityName, currentViewId } from "./pageQuery";

const retrieveFormControlDetails = (formContext: Xrm.Page): ControlDetails => ({
	entityName: formContext.data.entity.getEntityName(),
	controlType: "form/edit",
	id: formContext.ui.formSelector.getCurrentItem().getId().replace(/[{}]/g, "").toLowerCase(),
});

const retrieveViewControlDetails = (): ControlDetails => {
	const entityName = currentEntityName();
	const viewId = currentViewId();
	if (!entityName || !viewId) {
		throw new PageError("NoFormContext", "Navigate to a form or view before running this action");
	}
	return { entityName, controlType: "view", id: viewId.replace(/[{}%7B%7D]/gi, "").toLowerCase() };
};

export const pageTargetHandlers = defineHandlers({
	"utilities.navigateToRecord": async ({ entityLogicalName, recordId }) => {
		requireModelDrivenApp();
		await getXrm().Navigation.navigateTo({ pageType: "entityrecord", entityName: entityLogicalName, entityId: recordId }, { target: 1 });
	},
	"utilities.getPageTarget": (): PageTarget => {
		requireModelDrivenApp();
		const kind = getPageKind();
		const formContext = kind === "form" ? getFormContext() : null;
		const currentForm = formContext?.ui.formSelector.getCurrentItem();
		return {
			kind,
			entityLogicalName: formContext ? formContext.data.entity.getEntityName() : currentEntityName(),
			recordId: formContext ? getEntityId(formContext) : null,
			formId: currentForm ? normalizeGuid(currentForm.getId()) : null,
			formName: currentForm?.getLabel() ?? null,
			viewId: kind === "view" ? (currentViewId() ?? null) : null,
		};
	},
	"utilities.getControlDetails": () => {
		requireModelDrivenApp();
		return getPageKind() === "form" ? retrieveFormControlDetails(getFormContext()) : retrieveViewControlDetails();
	},
});
