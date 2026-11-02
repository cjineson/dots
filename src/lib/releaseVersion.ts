export type Bump = 'major' | 'minor' | 'patch';

export interface CommitMessage {
  subject: string;
  body?: string;
}

const CONVENTIONAL = /^(\w+)(\([^)]*\))?(!)?:\s/;

export function parseVersion(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    throw new Error(`Not a plain semver version: "${version}"`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// Merge commits carry no change of their own; the commits they bring in are classified instead.
function isMergeCommit(commit: CommitMessage): boolean {
  return /^Merge /.test(commit.subject);
}

// Returns null when there is nothing releasable. Non-conventional subjects count as patch changes.
export function bumpForCommits(commits: CommitMessage[]): Bump | null {
  const relevant = commits.filter((commit) => !isMergeCommit(commit));
  if (relevant.length === 0) {
    return null;
  }
  let bump: Bump = 'patch';
  for (const commit of relevant) {
    const match = CONVENTIONAL.exec(commit.subject);
    if (match?.[3] || /^BREAKING[ -]CHANGE:/m.test(commit.body ?? '')) {
      return 'major';
    }
    if (match?.[1] === 'feat') {
      bump = 'minor';
    }
  }
  return bump;
}

export function nextVersion(current: string, commits: CommitMessage[]): string {
  const bump = bumpForCommits(commits);
  const [major, minor, patch] = parseVersion(current);
  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }
  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  if (bump === 'patch') {
    return `${major}.${minor}.${patch + 1}`;
  }
  return current;
}
