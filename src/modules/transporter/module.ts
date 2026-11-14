import { ArrowSwap20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

export const transporterModule: ModuleDefinition = {
	id: "transporter",
	label: "Data Transporter",
	icon: ArrowSwap20Regular,
	order: 11,
	areas: [
		{
			id: "transporter.launch",
			label: "Data Transporter",
			breadcrumb: ["Data Transporter"],
			tooltip: "Copy or sync records between environments by primary key in a full-page tool",
			keywords: ["migrate", "migration", "sync", "copy records", "export", "import", "move data"],
			fit: "workspace",
			workspace: { id: "data-transporter" },
		},
	],
};
