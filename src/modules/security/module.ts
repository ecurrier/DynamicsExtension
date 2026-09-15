import { ShieldPerson20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { BulkUsersArea } from "./areas/bulk-users";
import { RolesArea } from "./areas/roles";
import { PrivilegeEditorArea, RoleCompareArea } from "./areas/tools";

export const securityModule: ModuleDefinition = {
	id: "security",
	label: "Security",
	icon: ShieldPerson20Regular,
	order: 7,
	areas: [
		{
			id: "security.roles",
			label: "Single User",
			breadcrumb: ["Security", "Single User"],
			tooltip: "Review and change the security roles assigned to one user",
			component: RolesArea,
		},
		{
			id: "security.bulk-users",
			label: "Bulk Users",
			breadcrumb: ["Security", "Bulk Users"],
			tooltip: "Add or remove security roles across a set of users in one run",
			component: BulkUsersArea,
		},
		{
			id: "security.compare",
			label: "Role Compare",
			breadcrumb: ["Security", "Role Compare"],
			tooltip: "See how two or more security roles differ",
			component: RoleCompareArea,
		},
		{
			id: "security.privileges",
			label: "Privilege Editor",
			breadcrumb: ["Security", "Privilege Editor"],
			tooltip: "Bulk change privilege depth across roles and tables",
			component: PrivilegeEditorArea,
		},
	],
};
