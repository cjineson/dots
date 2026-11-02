export interface BuildInfo {
  version: string;
  builtAt?: string;
  commit?: string;
}

// Local `expo start` runs have no build time or commit, since only the deploy workflow stamps them.
export function readBuildInfo(
  config: { version?: string; extra?: Record<string, unknown> } | null | undefined,
): BuildInfo {
  const extra = config?.extra ?? {};
  return {
    version: config?.version ?? 'unknown',
    builtAt: typeof extra.buildTime === 'string' ? extra.buildTime : undefined,
    commit: typeof extra.commit === 'string' ? extra.commit : undefined,
  };
}

export function formatBuildTime(iso: string | undefined): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
