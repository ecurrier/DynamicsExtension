import { create } from "zustand";

import { type CrashNote } from "@/shared/lib/feedback";

export interface CrashState {
	/**
	 * The crash the user chose to report, handed from the error boundary to the feedback Area.
	 * In memory only: a crash the user walked away from is not something to keep.
	 */
	pending: CrashNote | null;
	capture: (crash: CrashNote) => void;
	clear: () => void;
}

export const useCrashStore = create<CrashState>()((set) => ({
	pending: null,
	capture: (pending) => set({ pending }),
	clear: () => set({ pending: null }),
}));
