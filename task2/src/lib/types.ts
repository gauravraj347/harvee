// Shared types for the AI SQL Assistant.

export type ColumnType = "integer" | "numeric" | "boolean" | "date" | "timestamp" | "text";

export type ColumnMeta = {
  original: string; // original header from the uploaded file
  name: string; // sanitized SQL column identifier
  type: ColumnType; // inferred type
};

export type DatasetMeta = {
  id: number;
  name: string;
  tableName: string;
  columns: ColumnMeta[];
  rowCount: number;
  createdAt: string;
};

export type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
};
