declare module 'xlsx/xlsx.mjs' {
  export function read(data: unknown, opts?: unknown): {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };

  export const utils: {
    sheet_to_json(worksheet: unknown, opts?: unknown): unknown[][];
  };
}
