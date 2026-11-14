/**
 * Escape clears a search field that holds text. An empty field lets the key through, so a second
 * press still closes the dialog, panel or popover around the field.
 */
export const clearsOnEscape = (key: string, value: string): boolean => key === "Escape" && value !== "";
