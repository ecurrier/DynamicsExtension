export const escapeODataString = (value: string): string => value.replace(/'/g, "''");

export const odataStringLiteral = (value: string): string => `'${escapeODataString(value)}'`;
