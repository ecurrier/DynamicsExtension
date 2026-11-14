import { createContext, useContext } from "react";

/**
 * The element in the `AppShell` breadcrumb row that an `AreaShell` renders its slots into. A portal
 * keeps the slots in the Area's own React tree, so its state and handlers work as usual, while the
 * row they appear in belongs to the shell. There is no second place to put a toolbar.
 */
export const AreaShellSlotContext = createContext<HTMLElement | null>(null);

export const useAreaShellSlot = (): HTMLElement | null => useContext(AreaShellSlotContext);
