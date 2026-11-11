/** Resolve whether the API should use Postgres vs in-memory demo store. */

export function isPostgresUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://");
}

export function resolveDatabaseUrl(): string | undefined {
  return process.env.API_DATABASE_URL?.trim() || undefined;
}

export function usePostgresStore(): boolean {
  return isPostgresUrl(resolveDatabaseUrl());
}
