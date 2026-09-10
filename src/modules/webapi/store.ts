import { create } from "zustand";

export interface WebApiState {
	fetchXml: string;
	setFetchXml: (fetchXml: string) => void;
}

export const useWebApiStore = create<WebApiState>()((set) => ({
	fetchXml: "",
	setFetchXml: (fetchXml) => set({ fetchXml }),
}));
