import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { usePageQuery } from "@/messaging/client";
import { useSessionStore } from "@/shared/stores";

import { type QueryGateway } from "../hooks";
import { NO_ORIGIN } from "../lib";
import { useQueryBuilderStoreApi } from "../store";
import { BlankStartDialog } from "./BlankStartDialog";
import { PageStartDialog } from "./PageStartDialog";
import { STARTING_POINTS, type StartingPoint, type StartKind } from "./startKinds";
import { useReplaceQuery } from "./useReplaceQuery";
import { ViewStartDialog } from "./ViewStartDialog";

interface StartApi {
	startingPoints: readonly StartingPoint[];
	start: (kind: StartKind) => void;
}

const StartContext = createContext<StartApi | null>(null);

export const useStart = (): StartApi => {
	const api = useContext(StartContext);
	if (!api) {
		throw new Error("Starting points are used outside the Query Builder");
	}
	return api;
};

const useHasSourceTab = (): boolean => {
	const bound = useSessionStore((state) => state.tabId !== null && state.bridgeStatus === "ready");
	const context = usePageQuery("global.getPageContext", undefined, { enabled: bound });
	return bound && context.data === "model-driven-app";
};

type StartDialog = Exclude<StartKind, "paste">;

interface StartProviderProps {
	gateway: QueryGateway;
	children: ReactNode;
}

export const StartProvider = ({ gateway, children }: StartProviderProps) => {
	const store = useQueryBuilderStoreApi();
	const { mayReplace } = useReplaceQuery();
	const hasSourceTab = useHasSourceTab();
	const [dialog, setDialog] = useState<StartDialog | null>(null);

	const start = useCallback(
		(kind: StartKind) => {
			void (async () => {
				if (!(await mayReplace())) {
					return;
				}
				if (kind !== "paste") {
					setDialog(kind);
					return;
				}
				if (store.getState().text !== "") {
					store.getState().loadQuery("", NO_ORIGIN);
				}
				store.getState().focusXml();
			})();
		},
		[mayReplace, store]
	);

	const api = useMemo<StartApi>(
		() => ({ startingPoints: STARTING_POINTS.filter((point) => point.kind !== "page" || hasSourceTab), start }),
		[hasSourceTab, start]
	);

	const close = () => setDialog(null);

	return (
		<StartContext.Provider value={api}>
			{children}
			<BlankStartDialog open={dialog === "blank"} gateway={gateway} onClose={close} />
			<ViewStartDialog open={dialog === "view"} gateway={gateway} onClose={close} />
			<PageStartDialog open={dialog === "page"} onClose={close} />
		</StartContext.Provider>
	);
};
