import { type Template } from "@/shared/types";

const BUILT_IN_UPDATED_AT = "2026-09-07T00:00:00.000Z";

const builtIn = (template: Omit<Template, "builtIn" | "updatedAt">): Template => ({
	...template,
	builtIn: true,
	updatedAt: BUILT_IN_UPDATED_AT,
});

export const CSHARP_TABLE_TEMPLATE = builtIn({
	id: "builtin:csharp-table",
	name: "C# early-bound class",
	kind: "table",
	language: "csharp",
	filenamePattern: "{{table.identifier}}.cs",
	settings: [
		{ key: "namespace", label: "Namespace", default: "" },
		{ key: "baseClass", label: "Base class", default: "Entity" },
		{ key: "prefix", label: "Publisher prefixes to strip", default: "" },
	],
	text: `using System;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Client;

{{#settings.namespace}}
namespace {{settings.namespace}};

{{/settings.namespace}}
[EntityLogicalName("{{table.logicalName}}")]
public partial class {{table.identifier}}{{#settings.baseClass}} : {{settings.baseClass}}{{/settings.baseClass}}
{
    public const string EntityLogicalName = "{{table.logicalName}}";
    public const string EntitySetName = "{{table.entitySetName}}";

{{#settings.baseClass}}
    public {{table.identifier}}() : base(EntityLogicalName)
    {
    }

{{/settings.baseClass}}
    public static class Fields
    {
{{#columns}}
        public const string {{identifier}} = "{{logicalName}}";
{{/columns}}
    }

{{#columns}}
    [AttributeLogicalName("{{logicalName}}")]
    public {{type}} {{identifier}}
    {
{{#isDateOnly}}
        get => GetAttributeValue<DateTime?>("{{logicalName}}") is DateTime value ? DateOnly.FromDateTime(value) : null;
        set => SetAttributeValue("{{logicalName}}", value?.ToDateTime(TimeOnly.MinValue));
{{/isDateOnly}}
{{^isDateOnly}}
        get => GetAttributeValue<{{type}}>("{{logicalName}}");
{{#isPrimaryId}}
        set
        {
            SetAttributeValue("{{logicalName}}", value);
            Id = value ?? Guid.Empty;
        }
{{/isPrimaryId}}
{{^isPrimaryId}}
        set => SetAttributeValue("{{logicalName}}", value);
{{/isPrimaryId}}
{{/isDateOnly}}
    }
{{^isLast}}

{{/isLast}}
{{/columns}}
}
`,
});

export const TYPESCRIPT_TABLE_TEMPLATE = builtIn({
	id: "builtin:typescript-table",
	name: "TypeScript interface",
	kind: "table",
	language: "typescript",
	filenamePattern: "{{table.identifierCamel}}.ts",
	settings: [{ key: "prefix", label: "Publisher prefixes to strip", default: "" }],
	text: `export interface {{table.identifier}} {
{{#columns}}
  {{logicalName}}?: {{type}} | null
{{/columns}}
}

export const {{table.identifier}}Fields = {
{{#columns}}
  {{identifierCamel}}: '{{logicalName}}',
{{/columns}}
} as const

export const {{table.identifier}}Metadata = {
  logicalName: '{{table.logicalName}}',
  entitySetName: '{{table.entitySetName}}',
  primaryIdAttribute: '{{table.primaryIdAttribute}}',
} as const
`,
});

export const CSHARP_CHOICE_TEMPLATE = builtIn({
	id: "builtin:csharp-choice",
	name: "C# enum",
	kind: "choice",
	language: "csharp",
	filenamePattern: "{{choice.identifier}}.cs",
	settings: [],
	text: `public enum {{choice.identifier}}
{
{{#choice.options}}
\t{{identifierUnderscored}} = {{value}},
{{/choice.options}}
}`,
});

export const JAVASCRIPT_CHOICE_TEMPLATE = builtIn({
	id: "builtin:javascript-choice",
	name: "JavaScript object",
	kind: "choice",
	language: "javascript",
	filenamePattern: "{{choice.identifierPlural}}.js",
	settings: [],
	text: `const {{choice.identifierPlural}} = {
{{#choice.options}}
\t{{identifier}}: {{value}},
{{/choice.options}}
};`,
});

export const BUILTIN_TEMPLATES: Template[] = [CSHARP_TABLE_TEMPLATE, TYPESCRIPT_TABLE_TEMPLATE, CSHARP_CHOICE_TEMPLATE, JAVASCRIPT_CHOICE_TEMPLATE];
