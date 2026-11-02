// Run by the Deploy workflow before `eas update`. Works out the next semver from conventional commits
// since the last v* tag and stamps version, build time and commit into app.json (not committed).
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

import { nextVersion, type CommitMessage } from '../src/lib/releaseVersion';

const APP_JSON = 'app.json';

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function lastTag(): string | null {
  try {
    return git('describe', '--tags', '--match', 'v*', '--abbrev=0') || null;
  } catch {
    return null;
  }
}

function commitsSince(tag: string): CommitMessage[] {
  const raw = git('log', `${tag}..HEAD`, '--format=%s%x1f%b%x1e');
  return raw
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [subject, body] = entry.split('\x1f');
      return { subject: subject.trim(), body: body?.trim() };
    });
}

const app = JSON.parse(readFileSync(APP_JSON, 'utf8'));
const tag = lastTag();
// With no tag yet, publish the version already in app.json and tag it, then bump from there.
const version = tag ? nextVersion(tag.replace(/^v/, ''), commitsSince(tag)) : app.expo.version;

app.expo.version = version;
app.expo.extra = {
  ...app.expo.extra,
  buildTime: new Date().toISOString(),
  commit: git('rev-parse', '--short', 'HEAD'),
};
writeFileSync(APP_JSON, `${JSON.stringify(app, null, 2)}\n`);

console.log(`Version ${version} (previous tag: ${tag ?? 'none'})`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
}
