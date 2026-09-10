const GUID_PATTERN = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;

export const generateGuid = (): string => crypto.randomUUID();

export const isGuid = (value: string): boolean => GUID_PATTERN.test(value);

export const normalizeGuid = (value: string): string => value.replace(/[{}]/g, "").toLowerCase();
