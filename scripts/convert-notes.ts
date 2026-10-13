import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { convertNotesMarkdown } from '../src/lib/notesMarkdown';

const inputPath = process.argv[2];
const outputPath = process.argv[3];

function readMarkdownFile(filePath: string): string {
  const file = readFileSync(filePath);
  const isZip = file[0] === 0x50 && file[1] === 0x4b;

  if (!isZip) {
    return file.toString('utf8').replace(/^\uFEFF/, '');
  }

  let entries: string;
  try {
    entries = execFileSync('unzip', ['-Z1', filePath], { encoding: 'utf8' });
  } catch (error) {
    throw new Error(
      `Could not read the Apple Notes archive. Make sure the "unzip" command is available. ${error instanceof Error ? error.message : ''}`,
    );
  }

  const markdownEntries = entries.split(/\r?\n/).filter((entry) => /\.md$/i.test(entry));
  if (markdownEntries.length !== 1) {
    throw new Error(
      `Expected one Markdown document in the Notes archive, found ${markdownEntries.length}.`,
    );
  }

  try {
    return execFileSync('unzip', ['-p', filePath, markdownEntries[0]], {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    }).replace(/^\uFEFF/, '');
  } catch (error) {
    throw new Error(
      `Could not extract "${markdownEntries[0]}" from the Notes archive. ${error instanceof Error ? error.message : ''}`,
    );
  }
}

function main(): void {
  if (!inputPath) {
    throw new Error(
      'Usage: npm run convert:notes -- <Notes export or Markdown file> [output.json]',
    );
  }

  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputPath = path.resolve(
    outputPath ??
      path.join(
        path.dirname(resolvedInputPath),
        `${path.parse(resolvedInputPath).name}.gigbox.json`,
      ),
  );
  if (existsSync(resolvedOutputPath)) {
    throw new Error(`Output already exists; choose a different path: ${resolvedOutputPath}`);
  }

  const archive = convertNotesMarkdown(readMarkdownFile(resolvedInputPath));
  writeFileSync(resolvedOutputPath, `${JSON.stringify(archive, null, 2)}\n`, { flag: 'wx' });

  const songCount = archive.setlists.reduce((total, setlist) => total + setlist.songs.length, 0);
  console.log(
    `Converted ${songCount} songs across ${archive.setlists.length} setlists to ${resolvedOutputPath}`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Notes conversion failed.');
  process.exitCode = 1;
}
