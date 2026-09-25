import { Braces20Regular } from "@fluentui/react-icons";

import { type ModuleDefinition } from "@/modules/types";

import { GenerateArea } from "./areas/generate";
import { TemplatesArea } from "./areas/templates";

export const codegenModule: ModuleDefinition = {
	id: "codegen",
	label: "Code Generation",
	icon: Braces20Regular,
	order: 5,
	areas: [
		{
			id: "codegen.generate",
			label: "Generate",
			breadcrumb: ["Code Generation", "Generate"],
			tooltip: "Generate a class or enum for any table or choice from a Template",
			keywords: ["early bound", "class", "enum", "typescript", "c#", "csharp", "option set"],
			requires: "model-driven-app",
			component: GenerateArea,
		},
		{
			id: "codegen.templates",
			label: "Templates",
			breadcrumb: ["Code Generation", "Templates"],
			tooltip: "Author the Templates that shape generated code so it matches your codebase",
			keywords: ["mustache", "code templates"],
			component: TemplatesArea,
		},
	],
};
