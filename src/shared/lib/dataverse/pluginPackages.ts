import {
	type PackageAssembly,
	type PackageType,
	PLUGIN_PACKAGE_COMPONENT_NAME,
	type PluginPackage,
	type PluginPackageUpdate,
	type PluginPackageUpdateResult,
	type SolutionLayers,
} from "@/shared/types";

import { DataverseOperationError, isNotFoundError } from "./errors";
import { requireGuid } from "./guards";
import { type DataverseHttp } from "./http";
import { getAllPages } from "./paging";
import { solutionLayerOperations } from "./solutionLayers";
import { normalizeGuid } from "../guid";

const FORMATTED_VALUES = { Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"' };
const PACKAGE_SELECT = "pluginpackageid,name,uniquename,version,modifiedon,ismanaged,_modifiedby_value";
const PACKAGES_PATH = `pluginpackages?$select=${PACKAGE_SELECT}&$orderby=name asc`;
const ASSEMBLIES_PATH = "pluginassemblies?$select=pluginassemblyid,name,version,_packageid_value";
const TYPES_PATH = "plugintypes?$select=plugintypeid,typename,friendlyname,_pluginassemblyid_value";
const STEP_COUNTS_PATH = "sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid,_plugintypeid_value&$filter=ishidden/Value eq false";

export interface PackageRecord {
	pluginpackageid: string;
	name?: string | null;
	uniquename?: string | null;
	version?: string | null;
	modifiedon?: string | null;
	ismanaged?: boolean | null;
	_modifiedby_value?: string | null;
	"_modifiedby_value@OData.Community.Display.V1.FormattedValue"?: string | null;
}

export interface PackageAssemblyRecord {
	pluginassemblyid: string;
	name?: string | null;
	version?: string | null;
	_packageid_value?: string | null;
}

export interface PackageTypeRecord {
	plugintypeid: string;
	typename?: string | null;
	friendlyname?: string | null;
	_pluginassemblyid_value?: string | null;
}

export interface StepCountRecord {
	sdkmessageprocessingstepid: string;
	_plugintypeid_value?: string | null;
}

const guidOrNull = (value: string | null | undefined): string | null => (value ? normalizeGuid(value) : null);

const byName = (left: { name: string }, right: { name: string }): number => left.name.localeCompare(right.name);

const byTypeName = (left: PackageType, right: PackageType): number => left.typeName.localeCompare(right.typeName);

const groupBy = <T>(records: T[], keyOf: (record: T) => string | null): Map<string, T[]> => {
	const groups = new Map<string, T[]>();
	for (const record of records) {
		const key = keyOf(record);
		if (key) {
			groups.set(key, [...(groups.get(key) ?? []), record]);
		}
	}
	return groups;
};

export const composePluginPackages = (
	packages: PackageRecord[],
	assemblies: PackageAssemblyRecord[],
	types: PackageTypeRecord[],
	steps: StepCountRecord[]
): PluginPackage[] => {
	const stepsByType = groupBy(steps, (step) => guidOrNull(step._plugintypeid_value));
	const typesByAssembly = groupBy(types, (type) => guidOrNull(type._pluginassemblyid_value));
	const assembliesByPackage = groupBy(assemblies, (assembly) => guidOrNull(assembly._packageid_value));
	const toType = (record: PackageTypeRecord): PackageType => {
		const id = normalizeGuid(record.plugintypeid);
		return {
			id,
			typeName: record.typename ?? "Unknown type",
			friendlyName: record.friendlyname ?? null,
			stepCount: stepsByType.get(id)?.length ?? 0,
		};
	};
	const toAssembly = (record: PackageAssemblyRecord): PackageAssembly => {
		const id = normalizeGuid(record.pluginassemblyid);
		return {
			id,
			name: record.name ?? "Unknown assembly",
			version: record.version ?? null,
			types: (typesByAssembly.get(id) ?? []).map(toType).sort(byTypeName),
		};
	};
	return packages
		.map((record): PluginPackage => {
			const id = normalizeGuid(record.pluginpackageid);
			return {
				id,
				name: record.name ?? "Unknown package",
				uniqueName: record.uniquename ?? "",
				version: record.version ?? null,
				modifiedOn: record.modifiedon ?? null,
				modifiedBy: record["_modifiedby_value@OData.Community.Display.V1.FormattedValue"] ?? null,
				isManaged: record.ismanaged === true,
				assemblies: (assembliesByPackage.get(id) ?? []).map(toAssembly).sort(byName),
			};
		})
		.sort(byName);
};

const loadParts = (http: DataverseHttp) =>
	Promise.all([
		getAllPages<PackageAssemblyRecord>(http, ASSEMBLIES_PATH),
		getAllPages<PackageTypeRecord>(http, TYPES_PATH),
		getAllPages<StepCountRecord>(http, STEP_COUNTS_PATH),
	]);

export interface PluginPackageOperations {
	list: () => Promise<PluginPackage[]>;
	get: (request: { id: string }) => Promise<PluginPackage | null>;
	update: (request: PluginPackageUpdate) => Promise<PluginPackageUpdateResult>;
	getLayers: (request: { id: string }) => Promise<SolutionLayers>;
}

export const pluginPackageOperations = (http: DataverseHttp): PluginPackageOperations => ({
	list: async () => {
		const [packages, [assemblies, types, steps]] = await Promise.all([getAllPages<PackageRecord>(http, PACKAGES_PATH, FORMATTED_VALUES), loadParts(http)]);
		return composePluginPackages(packages.rows, assemblies.rows, types.rows, steps.rows);
	},
	get: async ({ id }) => {
		const packageId = requireGuid(id, "Package");
		let record: PackageRecord | undefined;
		try {
			record = await http.request<PackageRecord | undefined>(
				"GET",
				`pluginpackages(${packageId})?$select=${PACKAGE_SELECT}`,
				undefined,
				FORMATTED_VALUES
			);
		} catch (error) {
			if (isNotFoundError(error)) {
				return null;
			}
			throw error;
		}
		if (!record) {
			return null;
		}
		const [assemblies, types, steps] = await loadParts(http);
		return composePluginPackages([record], assemblies.rows, types.rows, steps.rows)[0] ?? null;
	},
	update: async ({ id, content }) => {
		const packageId = requireGuid(id, "Package");
		if (content.length === 0) {
			throw new DataverseOperationError("InvalidArgument", "The package content is empty");
		}
		await http.patch(`pluginpackages(${packageId})`, { content });
		return { id: packageId };
	},
	getLayers: ({ id }) => solutionLayerOperations(http).getSolutionLayers({ componentId: id, solutionComponentName: PLUGIN_PACKAGE_COMPONENT_NAME }),
});
