import { type SystemUser } from "@/shared/types";

export const toggleSelection = (selected: string[], id: string): string[] =>
	selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id];

export const mergeSelection = (selected: string[], ids: string[]): string[] => [...new Set([...selected, ...ids])];

export const applyVisibleSelection = (selected: string[], visibleIds: string[], nowSelected: string[]): string[] => {
	const visible = new Set(visibleIds);
	const kept = selected.filter((id) => !visible.has(id));
	return [...kept, ...nowSelected.filter((id) => visible.has(id))];
};

export const selectionSummary = (selected: string[]): string =>
	selected.length === 0 ? "No users selected." : selected.length === 1 ? "1 user selected." : `${selected.length} users selected.`;

export const selectedUsers = (users: SystemUser[], selected: string[]): SystemUser[] => {
	const order = new Map(selected.map((id, index) => [id, index]));
	return users.filter((user) => order.has(user.id)).sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
};
