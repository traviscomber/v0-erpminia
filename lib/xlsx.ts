export type XlsxLikeModule = {
  read: (
    buffer: Buffer | ArrayBuffer,
    options: { type: 'buffer'; cellDates: boolean } | { type: 'array'; cellDates?: boolean }
  ) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (sheet: unknown, options: { header: number; defval: string; raw: boolean }) => unknown[][];
    json_to_sheet?: (data: Record<string, unknown>[]) => unknown;
    book_new?: () => unknown;
    book_append_sheet?: (workbook: unknown, worksheet: unknown, name: string) => void;
  };
  writeFile?: (workbook: unknown, filename: string) => void;
};

let cachedXlsx: Promise<XlsxLikeModule> | null = null;

export function loadXlsxModule() {
  if (!cachedXlsx) {
    cachedXlsx = import('xlsx').then((mod) => mod as unknown as XlsxLikeModule);
  }

  return cachedXlsx;
}
