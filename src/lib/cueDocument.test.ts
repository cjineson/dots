import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createCueDocumentFromText,
  flattenCueDocument,
  getVisibleCueBlocks,
  parseCueDocument,
  serializeCueDocument,
} from './cueDocument';

test('legacy multiline cue text becomes one text block', () => {
  const text = 'Chords: C G\nLyrics start here';
  const document = createCueDocumentFromText(text);

  assert.equal(document.blocks.length, 1);
  assert.equal(document.blocks[0].type, 'text');
  assert.equal(flattenCueDocument(document), text);
});

test('cue documents preserve section styles and table rows through serialization', () => {
  const document = {
    version: 1 as const,
    blocks: [
      { id: 'section', type: 'section' as const, text: 'Chords', color: '#FFCC00' as const },
      {
        id: 'table',
        type: 'table' as const,
        rows: [
          ['Verse', 'Chorus'],
          ['C', 'G'],
        ],
        font_size: 22,
        color: '#4FC3F7' as const,
      },
    ],
  };

  assert.deepEqual(parseCueDocument(serializeCueDocument(document)), document);
  assert.equal(flattenCueDocument(document), 'Chords\nVerse | Chorus\nC | G');
});

test('performance views hide generated section labels but retain cues and tables', () => {
  const document = {
    version: 1 as const,
    blocks: [
      { id: 'key-label', type: 'section' as const, text: 'Key / capo' },
      { id: 'key-value', type: 'text' as const, text: 'E' },
      { id: 'chord-label', type: 'section' as const, text: 'Chords' },
      { id: 'chord-value', type: 'text' as const, text: 'Em G C' },
      { id: 'lyrics-label', type: 'section' as const, text: 'Lyrics / cues' },
      { id: 'lyrics-value', type: 'text' as const, text: 'Sing this line' },
      { id: 'custom-label', type: 'section' as const, text: 'Bridge' },
      { id: 'lyrics', type: 'text' as const, text: 'Sing this line' },
      { id: 'table', type: 'table' as const, rows: [['Verse', 'Chorus'], ['C', 'G']] },
    ],
  };

  assert.deepEqual(
    getVisibleCueBlocks(document).map((block) => block.id),
    ['performance-columns-key-label', 'custom-label', 'lyrics', 'table'],
  );
  assert.deepEqual(
    getVisibleCueBlocks(document)[0],
    {
      id: 'performance-columns-key-label',
      type: 'table',
      rows: [['E', 'Em G C', 'Sing this line']],
    },
  );
});

test('cue documents reject non-rectangular tables and unsupported colors', () => {
  assert.throws(
    () =>
      parseCueDocument(
        JSON.stringify({
          version: 1,
          blocks: [{ id: 'table', type: 'table', rows: [['A', 'B'], ['C', 'D', 'E']] }],
        }),
      ),
    { message: 'Table in cue block 1 has inconsistent column counts.' },
  );

  assert.throws(
    () =>
      parseCueDocument(
        JSON.stringify({
          version: 1,
          blocks: [{ id: 'cue', type: 'text', text: 'Cue', color: '#123456' }],
        }),
      ),
    { message: 'Cue block 1 has an invalid text color.' },
  );
});
