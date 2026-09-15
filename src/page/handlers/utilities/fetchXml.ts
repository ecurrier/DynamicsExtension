import { defineHandlers, PageError } from "@/messaging/page";
import { getEntityId, getFormContext, getPageKind, getXrm, retrieveMultipleOData } from "@/page/xrm";
import { type NamedFetchXml } from "@/shared/types";

import { collapseWhitespace, currentEntityName, hasFetchXml, isGridControl, listPageControls } from "./pageQuery";

const retrieveSavedQueries = async (): Promise<NamedFetchXml[]> => {
	const entityName = currentEntityName();
	if (!entityName) {
		throw new PageError("EntityNameNotFound", "Could not determine the table for the current view");
	}
	const query = `?$filter=returnedtypecode eq '${encodeURIComponent(entityName)}' and fetchxml ne null&$select=fetchxml,name&$orderby=name asc`;
	const savedQueries = await retrieveMultipleOData<{ name: string; fetchxml: string }>("savedquery", query);
	return savedQueries.map((savedQuery) => ({ name: savedQuery.name, fetchXml: savedQuery.fetchxml }));
};

const resolvePrimaryIdAttribute = async (entityName: string): Promise<string> => {
	try {
		const metadata = await getXrm().Utility.getEntityMetadata(entityName, []);
		return metadata.PrimaryIdAttribute || `${entityName}id`;
	} catch {
		return `${entityName}id`;
	}
};

const createRecordQuery = async (formContext: Xrm.Page): Promise<NamedFetchXml> => {
	const entityName = formContext.data.entity.getEntityName();
	const entityId = getEntityId(formContext);
	const primaryIdAttribute = await resolvePrimaryIdAttribute(entityName);
	const fetchXml = collapseWhitespace(`
    <fetch>
      <entity name="${entityName}">
        <attribute name="${primaryIdAttribute}" />
        <filter type="and">
          <condition attribute="${primaryIdAttribute}" operator="eq" value="${entityId}" />
        </filter>
      </entity>
    </fetch>`);
	return { name: `Current Record (${entityName})`, fetchXml };
};

const createSubgridQueries = (formContext: Xrm.Page): NamedFetchXml[] =>
	formContext
		.getControl()
		.filter(isGridControl)
		.filter((control) => hasFetchXml(control) && control.getFetchXml() && control.getRelationship?.())
		.map((control) => ({
			name: `Subgrid as displayed: ${control.getLabel()} (${control.getRelationship().name})`,
			fetchXml: control.getFetchXml(),
		}));

const createAppliedViewQueries = (): NamedFetchXml[] =>
	listPageControls()
		.filter(hasFetchXml)
		.flatMap((control) => {
			let fetchXml = "";
			try {
				fetchXml = control.getFetchXml();
			} catch {
				return [];
			}
			if (!fetchXml) {
				return [];
			}
			const label = (control as Partial<Xrm.Controls.GridControl>).getLabel?.() ?? control.getName();
			return [{ name: `View as displayed: ${label}`, fetchXml }];
		});

export const fetchXmlHandlers = defineHandlers({
	"utilities.generateFetchXml": async () => {
		if (getPageKind() !== "form") {
			const applied = createAppliedViewQueries();
			const queries = [...applied, ...(await retrieveSavedQueries())];
			if (queries.length === 0) {
				throw new PageError("NotFound", "No views or saved queries were found for this page");
			}
			return queries;
		}
		const formContext = getFormContext();
		return [await createRecordQuery(formContext), ...createSubgridQueries(formContext)];
	},
});
