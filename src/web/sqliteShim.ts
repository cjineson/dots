// Web-only stand-in for expo-sqlite, used for browser (Playwright) runs.
// expo-sqlite's web build cannot serve synchronous calls during startup, so this
// runs sql.js (in-memory) behind the same synchronous API subset the app uses.
import initSqlJs from 'sql.js/dist/sql-asm.js';

type Params = unknown[];
type SqlJsDatabase = {
  exec(sql: string): unknown;
  run(sql: string, params?: Params): void;
  prepare(sql: string): {
    bind(params?: Params): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  };
  getRowsModified(): number;
};

let SQL: { Database: new () => SqlJsDatabase } | null = null;

export async function initSqliteShim(): Promise<void> {
  SQL = await initSqlJs();
}

class ShimDatabase {
  private readonly raw: SqlJsDatabase;

  constructor() {
    if (!SQL) {
      throw new Error('initSqliteShim() must finish before opening a database');
    }
    this.raw = new SQL.Database();
  }

  execSync(sql: string): void {
    this.raw.exec(sql);
  }

  runSync(sql: string, params: Params = []) {
    this.raw.run(sql, params);
    return { changes: this.raw.getRowsModified(), lastInsertRowId: 0 };
  }

  getAllSync<T>(sql: string, params: Params = []): T[] {
    const statement = this.raw.prepare(sql);
    try {
      statement.bind(params);
      const rows: T[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject() as T);
      }
      return rows;
    } finally {
      statement.free();
    }
  }

  getFirstSync<T>(sql: string, params: Params = []): T | null {
    return this.getAllSync<T>(sql, params)[0] ?? null;
  }

  withTransactionSync(task: () => void): void {
    this.raw.exec('BEGIN');
    try {
      task();
      this.raw.exec('COMMIT');
    } catch (error) {
      this.raw.exec('ROLLBACK');
      throw error;
    }
  }
}

export function openDatabaseSync(_name: string): ShimDatabase {
  return new ShimDatabase();
}
