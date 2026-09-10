export interface PackageType {
	id: string;
	typeName: string;
	friendlyName: string | null;
	stepCount: number;
}

export interface PackageAssembly {
	id: string;
	name: string;
	version: string | null;
	types: PackageType[];
}

export interface PluginPackage {
	id: string;
	name: string;
	uniqueName: string;
	version: string | null;
	modifiedOn: string | null;
	modifiedBy: string | null;
	isManaged: boolean;
	assemblies: PackageAssembly[];
}

export interface PluginPackageUpdate {
	id: string;
	content: string;
}

export interface PluginPackageUpdateResult {
	id: string;
}

export const PLUGIN_PACKAGE_COMPONENT_NAME = "PluginPackage";
