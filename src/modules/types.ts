import { type FluentIcon } from "@fluentui/react-icons";
import { type ComponentType } from "react";

import { type PageRequirement, type SchemaTool, type SecurityTool, type WorkspaceId } from "@/shared/types";

export type AreaId = string;

export interface UtilityDefinition {
	id: string;
	title: string;
	description: string;
	keywords?: string[];
}

/**
 * The width an Area needs. `"panel"` is the default and means the Area works from about 400px up,
 * which is what ADR 0002 asked of every Area. An Area earns `"window"` only by failing in the
 * harness. `"workspace"` means the Area is a Workspace, and selecting it opens that Workspace.
 */
export type AreaFit = "panel" | "window" | "workspace";

/** The Workspace a `fit: "workspace"` Area opens, and the tool within it. */
export interface AreaWorkspace {
	id: WorkspaceId;
	tool?: SchemaTool | SecurityTool;
}

export interface AreaDefinition {
	id: AreaId;
	label: string;
	breadcrumb: string[];
	tooltip?: string;
	keywords?: string[];
	utilities?: UtilityDefinition[];
	requires?: PageRequirement;
	fit?: AreaFit;
	/** Required when `fit` is `"workspace"`, and meaningless otherwise. */
	workspace?: AreaWorkspace;
	/** A `fit: "workspace"` Area has none: the gate opens the Workspace instead. */
	component?: ComponentType;
}

export interface ModuleDefinition {
	id: string;
	label: string;
	icon: FluentIcon;
	order: number;
	areas: AreaDefinition[];
}
