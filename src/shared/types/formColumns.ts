export interface FormControlInfo {
	name: string;
	label: string;
	controlType: string;
	tab: string | null;
	section: string | null;
	visible: boolean;
	disabled: boolean;
}

export interface FormAttributeInfo {
	logicalName: string;
	displayName: string;
	attributeType: string;
	controls: FormControlInfo[];
}

export interface FormColumnDetails {
	logicalName: string;
	displayName: string;
	attributeType: string;
	requiredLevel: string;
	value: string | null;
	onForm: boolean;
	controls: FormControlInfo[];
}

export interface RevealFormColumnRequest {
	logicalName: string;
	show: boolean;
}

export interface RecordPayloadSource {
	entityLogicalName: string;
	recordId: string;
	values: Record<string, unknown>;
}

export interface DirtyColumn extends FormColumnDetails {
	submitMode: string;
}

export interface DirtyColumnsResult {
	entityLogicalName: string;
	recordId: string | null;
	isNew: boolean;
	total: number;
	columns: DirtyColumn[];
}
