import { DagContentBlock, DagNode } from '../models/dag.models';
import { normalizeContent } from '../layout/graph-utils';

export const EXPANDED_MIN_WIDTH = 264;
export const EXPANDED_MEDIA_WIDTH = 320;
export const EXPANDED_HEADER_HEIGHT = 57;
export const DETAIL_ROW_HEIGHT = 28;
export const DETAIL_ROW_GAP = 8;
export const CONTENT_MAX_HEIGHT = 280;
export const CONTENT_PAD = 16;

function blocksFor(node: DagNode): DagContentBlock[] {
  const declared = normalizeContent(node);
  if (declared.length) {
    return declared;
  }
  if (node.data && typeof node.data === 'object' && !Array.isArray(node.data)) {
    return [{ type: 'keyValue', items: node.data as Record<string, string | number> }];
  }
  return [];
}

function blockHeight(block: DagContentBlock): number {
  switch (block.type) {
    case 'text':
      return 36;
    case 'html':
      return 48;
    case 'image':
      return block.height ?? 120;
    case 'video':
    case 'website':
      return block.height ?? 140;
    case 'table':
      return 28 + block.rows.length * DETAIL_ROW_HEIGHT;
    case 'keyValue': {
      const count = Array.isArray(block.items) ? block.items.length : Object.keys(block.items).length;
      return count * (DETAIL_ROW_HEIGHT + DETAIL_ROW_GAP);
    }
    case 'list':
      return block.items.length * 22 + 8;
    case 'link':
      return 28;
    case 'form':
      return block.fields.length * 52 + 36;
    default:
      return 32;
  }
}

export function expandedWidthFor(node: DagNode): number {
  if (node.expandedWidth) {
    return node.expandedWidth;
  }
  const blocks = blocksFor(node);
  if (
    blocks.some((b) => b.type === 'image' || b.type === 'video' || b.type === 'table' || b.type === 'website')
  ) {
    return EXPANDED_MEDIA_WIDTH;
  }
  return EXPANDED_MIN_WIDTH;
}

export function expandedHeightFor(node: DagNode): number {
  if (node.expandedHeight) {
    return node.expandedHeight;
  }
  const blocks = blocksFor(node);
  let body = CONTENT_PAD;
  if (!blocks.length) {
    body += 32;
  } else {
    for (const block of blocks) {
      body += blockHeight(block) + DETAIL_ROW_GAP;
    }
  }
  body = Math.min(body, CONTENT_MAX_HEIGHT + CONTENT_PAD);
  return EXPANDED_HEADER_HEIGHT + body;
}

export function contentBlocksFor(node: DagNode): DagContentBlock[] {
  return blocksFor(node);
}

export function kvItems(
  items: Record<string, string | number> | { key: string; value: string | number }[],
): { key: string; value: string }[] {
  if (Array.isArray(items)) {
    return items.map((i) => ({ key: i.key, value: String(i.value) }));
  }
  return Object.entries(items).map(([key, value]) => ({ key, value: String(value) }));
}
