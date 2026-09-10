import { type PluginPackage } from "@/shared/types";

export interface PackageTypeRow {
	assemblyName: string;
	assemblyVersion: string | null;
	typeName: string;
	friendlyName: string | null;
	stepCount: number;
}

export interface PackageCounts {
	assemblies: number;
	types: number;
	steps: number;
}

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

const contains = (value: string | null | undefined, needle: string): boolean => (value ?? "").toLowerCase().includes(needle);

export const packageMatches = (pkg: PluginPackage, filter: string): boolean => {
	const needle = filter.trim().toLowerCase();
	if (needle === "") {
		return true;
	}
	return (
		contains(pkg.name, needle) ||
		contains(pkg.uniqueName, needle) ||
		contains(pkg.version, needle) ||
		pkg.assemblies.some(
			(assembly) =>
				contains(assembly.name, needle) || assembly.types.some((type) => contains(type.typeName, needle) || contains(type.friendlyName, needle))
		)
	);
};

export const packageTypeRows = (pkg: PluginPackage): PackageTypeRow[] =>
	pkg.assemblies.flatMap((assembly) =>
		assembly.types.map((type) => ({
			assemblyName: assembly.name,
			assemblyVersion: assembly.version,
			typeName: type.typeName,
			friendlyName: type.friendlyName,
			stepCount: type.stepCount,
		}))
	);

export const packageCounts = (pkg: PluginPackage): PackageCounts => ({
	assemblies: pkg.assemblies.length,
	types: pkg.assemblies.reduce((count, assembly) => count + assembly.types.length, 0),
	steps: pkg.assemblies.reduce((count, assembly) => count + assembly.types.reduce((inner, type) => inner + type.stepCount, 0), 0),
});

export const describeCounts = ({ assemblies, types, steps }: PackageCounts): string =>
	[
		`${assemblies} ${assemblies === 1 ? "assembly" : "assemblies"}`,
		`${types} ${types === 1 ? "type" : "types"}`,
		`${steps} ${steps === 1 ? "step" : "steps"}`,
	].join(" · ");

export const formatFileSize = (bytes: number): string => {
	if (bytes < KILOBYTE) {
		return `${bytes} B`;
	}
	if (bytes < MEGABYTE) {
		return `${(bytes / KILOBYTE).toFixed(1)} KB`;
	}
	return `${(bytes / MEGABYTE).toFixed(2)} MB`;
};

export const formatTimestamp = (value: string | null): string => {
	if (!value) {
		return "";
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const packageIds = (pkg: Pick<PluginPackage, "name" | "uniqueName">): string[] => {
	const separator = pkg.uniqueName.indexOf("_");
	const stripped = separator > 0 ? pkg.uniqueName.slice(separator + 1) : pkg.uniqueName;
	return [pkg.name, pkg.uniqueName, stripped].map((value) => value.trim().toLowerCase()).filter((value) => value !== "");
};

export const fileNameMatchesPackage = (fileName: string, pkg: Pick<PluginPackage, "name" | "uniqueName">): boolean => {
	const lower = fileName.trim().toLowerCase();
	return packageIds(pkg).some((id) => lower === `${id}.nupkg` || lower.startsWith(`${id}.`));
};

export const isPackageFileName = (fileName: string): boolean => fileName.trim().toLowerCase().endsWith(".nupkg");

export const describeUpdate = (previous: Pick<PluginPackage, "version" | "modifiedOn">, refreshed: PluginPackage | null): string => {
	if (!refreshed) {
		return "The package was uploaded. Reload to see the new modified time.";
	}
	const parts = [`Modified ${formatTimestamp(refreshed.modifiedOn) || "just now"}`];
	if (refreshed.version && refreshed.version !== previous.version) {
		parts.push(`version ${previous.version ?? "unknown"} to ${refreshed.version}`);
	}
	return parts.join(" · ");
};
