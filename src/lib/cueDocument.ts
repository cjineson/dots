import type { CueBlock, CueBlockStyle, CueDocument, CueTextColor } from '../types';

export const CUE_COLORS: CueTextColor[] = ['#FFFFFF', '#FFCC00', '#4FC3F7', '#FF8A80'];

const GENERATED_SECTION_LABELS = new Set([
  'additional notes',
  'chords',
  'key / capo',
  'lyrics / cues',
]);

export function getVisibleCueBlocks(document: CueDocument): CueBlock[] {
  const visibleBlocks: CueBlock[] = [];
  let generatedColumns: string[] = [];
  let generatedColumnId: string | undefined;

  const flushGeneratedColumns = () => {
    if (generatedColumns.length > 1 && generatedColumnId) {
      visibleBlocks.push({
        id: `performance-columns-${generatedColumnId}`,
        type: 'table',
        rows: [generatedColumns],
      });
    } else if (generatedColumns.length === 1) {
      visibleBlocks.push({ id: `performance-value-${generatedColumnId}`, type: 'text', text: generatedColumns[0] });
    }
    generatedColumns = [];
    generatedColumnId = undefined;
  };

  for (let index = 0; index < document.blocks.length; index += 1) {
    const block = document.blocks[index];
    const nextBlock = document.blocks[index + 1];
    if (
      block.type === 'section' &&
      GENERATED_SECTION_LABELS.has(block.text.trim().toLowerCase()) &&
      nextBlock?.type === 'text'
    ) {
      generatedColumnId ??= block.id;
      generatedColumns.push(nextBlock.text);
      index += 1;
      continue;
    }

    flushGeneratedColumns();
    if (
      block.type !== 'section' ||
      !GENERATED_SECTION_LABELS.has(block.text.trim().toLowerCase())
    ) {
      visibleBlocks.push(block);
    }
  }

  flushGeneratedColumns();
  return visibleBlocks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCueTextColor(value: unknown): value is CueTextColor {
  return CUE_COLORS.some((color) => color === value);
}

function validateStyle(value: Record<string, unknown>, blockIndex: number): CueBlockStyle {
  const fontSize = value.font_size;
  const color = value.color;
  if (
    fontSize !== undefined &&
    (typeof fontSize !== 'number' || fontSize < 10 || fontSize > 64)
  ) {
    throw new Error(`Cue block ${blockIndex + 1} has an invalid font size.`);
  }

  if (color !== undefined && !isCueTextColor(color)) {
    throw new Error(`Cue block ${blockIndex + 1} has an invalid text color.`);
  }

  return {
    ...(typeof fontSize === 'number' ? { font_size: fontSize } : {}),
    ...(isCueTextColor(color) ? { color } : {}),
  };
}

export function validateCueDocument(value: unknown): CueDocument {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.blocks)) {
    throw new Error('The cue document has an unsupported format.');
  }

  const blocks = value.blocks.map((block, index): CueBlock => {
    if (!isRecord(block) || typeof block.id !== 'string' || !block.id) {
      throw new Error(`Cue block ${index + 1} is invalid.`);
    }

    const style = validateStyle(block, index);

    if (
      (block.type === 'text' || block.type === 'section') &&
      typeof block.text === 'string'
    ) {
      return {
        id: block.id,
        type: block.type,
        text: block.text,
        ...style,
      };
    }

    if (block.type === 'table' && Array.isArray(block.rows) && block.rows.length > 0) {
      const rows = block.rows.map((row) => {
        if (!Array.isArray(row) || row.length < 2 || !row.every((cell) => typeof cell === 'string')) {
          throw new Error(`Table in cue block ${index + 1} must contain at least two text cells per row.`);
        }
        return row;
      });
      const columnCount = rows[0].length;
      if (rows.some((row) => row.length !== columnCount)) {
        throw new Error(`Table in cue block ${index + 1} has inconsistent column counts.`);
      }

      return {
        id: block.id,
        type: 'table',
        rows,
        ...style,
      };
    }

    throw new Error(`Cue block ${index + 1} is invalid.`);
  });

  return { version: 1, blocks };
}

export function parseCueDocument(json: string): CueDocument {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('The cue document is not valid JSON.');
  }
  return validateCueDocument(value);
}

export function createCueDocumentFromText(text: string): CueDocument {
  return {
    version: 1,
    blocks: [{ id: 'legacy-text', type: 'text', text }],
  };
}

export function serializeCueDocument(document: CueDocument): string {
  return JSON.stringify(document);
}

export function flattenCueDocument(document: CueDocument): string {
  return document.blocks
    .map((block) =>
      block.type === 'table'
        ? block.rows.map((row) => row.join(' | ')).join('\n')
        : block.text,
    )
    .join('\n');
}
