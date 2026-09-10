import { useMemo } from "react";

import { type PopupLaunch, readPopupLaunch } from "@/shared/extension";

export const usePopupLaunch = (): PopupLaunch => useMemo(() => readPopupLaunch(), []);
