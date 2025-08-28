// src/services/baseService.ts
import { AnyPgTable, AnyPgColumn } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import db from "../drizzle/db";

/**
 * Generic BaseService for basic CRUD operations.
 *
 * TTable: Drizzle table type (AnyPgTable)
 * TInsert: input shape for create (inserts)
 * TSelect: selected row shape (what the DB returns)
 */
export class BaseService<
  TTable extends AnyPgTable,
  TInsert extends Record<string, any>,
  TSelect extends Record<string, any>
> {
  protected table: TTable;
  protected idColumn: AnyPgColumn;

  constructor(table: TTable, idColumn: AnyPgColumn) {
    this.table = table;
    this.idColumn = idColumn;
  }

  /**
   * Create a row and return the inserted row.
   */
  async create(data: TInsert): Promise<TSelect> {
    // Drizzle's types can be strict here; cast at the call-site only.
    const result = await (db.insert(this.table as any).values(data).returning() as unknown);
    // result is usually an array of rows
    const row = (result as any[])[0];
    return row as TSelect;
  }

  /**
   * Get all rows. You can extend this to accept pagination, filters, etc.
   */
  async findAll(): Promise<TSelect[]> {
    const result = await (db.select().from(this.table as any) as unknown);
    return result as TSelect[];
  }

  /**
   * Find a row by primary key (idColumn).
   */
  async findById(id: string | number): Promise<TSelect | undefined> {
    const result = await (db
      .select()
      .from(this.table as any)
      .where(eq(this.idColumn as any, id)) as unknown);
    // Drizzle returns array of rows for select
    const row = (result as TSelect[])[0];
    return row;
  }

  /**
   * Update by primary key and return updated row.
   */
  async update(id: string | number, data: Partial<TInsert>): Promise<TSelect | undefined> {
    const result = await (db
      .update(this.table as any)
      .set(data)
      .where(eq(this.idColumn as any, id))
      .returning() as unknown);
    const row = (result as any[])[0];
    return row as TSelect | undefined;
  }

  /**
   * Delete by primary key. Returns true if deleted.
   * Optionally return deleted row by using `.returning()` if your DB supports it.
   */
  async delete(id: string | number): Promise<boolean> {
    const result = await (db.delete(this.table as any).where(eq(this.idColumn as any, id)) as unknown);
    // result might be a QueryResult-like object (depends on driver). For Postgres with drizzle,
    // you can also use `.returning()` and inspect the returned rows.
    // Here we try to check rowCount if present, otherwise optimistically return true.
    const r: any = result;
    if (typeof r?.rowCount === "number") {
      return r.rowCount > 0;
    }
    // Fallback: assume success (you can modify to return deleted row via .returning())
    return true;
  }
}
