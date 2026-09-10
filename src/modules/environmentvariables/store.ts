import { create } from "zustand";

import { type ConnectionTarget, PAGE_CONNECTION } from "@/shared/connections";
import { type EnvironmentVariableType } from "@/shared/types";

export interface EnvironmentVariablesState {
	connection: ConnectionTarget;
	filter: string;
	typeFilter: EnvironmentVariableType | null;
	selectedId: string | null;
	setConnection: (connection: ConnectionTarget) => void;
	setFilter: (filter: string) => void;
	setTypeFilter: (typeFilter: EnvironmentVariableType | null) => void;
	select: (selectedId: string | null) => void;
}

export const useEnvironmentVariablesStore = create<EnvironmentVariablesState>()((set) => ({
	connection: PAGE_CONNECTION,
	filter: "",
	typeFilter: null,
	selectedId: null,
	setConnection: (connection) => set({ connection, selectedId: null }),
	setFilter: (filter) => set({ filter }),
	setTypeFilter: (typeFilter) => set({ typeFilter }),
	select: (selectedId) => set({ selectedId }),
}));
