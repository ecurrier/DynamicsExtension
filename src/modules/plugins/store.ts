import { create } from "zustand";

import { type ConnectionTarget, PAGE_CONNECTION } from "@/shared/connections";

import { type StepStateFilter } from "./lib";

export interface PluginsState {
	connection: ConnectionTarget;
	filter: string;
	stateFilter: StepStateFilter;
	checkedIds: Set<string>;
	openItems: string[];
	focusStepId: string | null;
	packagesFilter: string;
	packagesOpenItems: string[];
	setConnection: (connection: ConnectionTarget) => void;
	setFilter: (filter: string) => void;
	setStateFilter: (stateFilter: StepStateFilter) => void;
	setChecked: (ids: string[], checked: boolean) => void;
	clearChecked: () => void;
	setOpenItems: (openItems: string[]) => void;
	focusStep: (step: { id: string; name: string }, connection: ConnectionTarget) => void;
	clearFocus: () => void;
	setPackagesFilter: (filter: string) => void;
	setPackagesOpenItems: (openItems: string[]) => void;
}

export const usePluginsStore = create<PluginsState>()((set) => ({
	connection: PAGE_CONNECTION,
	filter: "",
	stateFilter: "all",
	checkedIds: new Set(),
	openItems: [],
	focusStepId: null,
	packagesFilter: "",
	packagesOpenItems: [],
	setConnection: (connection) => set({ connection, checkedIds: new Set(), openItems: [], focusStepId: null, packagesOpenItems: [] }),
	setFilter: (filter) => set({ filter, focusStepId: null }),
	setStateFilter: (stateFilter) => set({ stateFilter }),
	setChecked: (ids, checked) =>
		set((state) => {
			const next = new Set(state.checkedIds);
			for (const id of ids) {
				if (checked) {
					next.add(id);
				} else {
					next.delete(id);
				}
			}
			return { checkedIds: next };
		}),
	clearChecked: () => set({ checkedIds: new Set() }),
	setOpenItems: (openItems) => set({ openItems }),
	focusStep: (step, connection) =>
		set({
			connection,
			filter: step.name,
			stateFilter: "all",
			checkedIds: new Set([step.id]),
			openItems: [],
			focusStepId: step.id,
		}),
	clearFocus: () => set({ focusStepId: null }),
	setPackagesFilter: (packagesFilter) => set({ packagesFilter }),
	setPackagesOpenItems: (packagesOpenItems) => set({ packagesOpenItems }),
}));
