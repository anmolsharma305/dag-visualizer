import { describe, expect, it } from 'vitest';
import { DagEdge, DagNode } from '../models/dag.models';
import {
  buildAdjacency,
  connectedComponents,
  detectCycle,
  edgeId,
  findPath,
  topologicalOrder,
} from './graph-utils';

const nodes = (ids: string[]): DagNode[] => ids.map((id) => ({ id, label: id }));

describe('graph-utils', () => {
  it('derives edge ids', () => {
    expect(edgeId({ source: 'a', target: 'b' })).toBe('a->b');
    expect(edgeId({ id: 'e1', source: 'a', target: 'b' })).toBe('e1');
  });

  it('builds adjacency and topological order for a diamond DAG', () => {
    const n = nodes(['A', 'B', 'C', 'D']);
    const e: DagEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'D' },
      { source: 'C', target: 'D' },
    ];
    const adj = buildAdjacency(n, e);
    expect(adj.out.get('A')).toEqual(['B', 'C']);
    expect(adj.indegree.get('D')).toBe(2);
    const order = topologicalOrder(n, adj);
    expect(order[0]).toBe('A');
    expect(order.at(-1)).toBe('D');
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'));
    expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'));
    expect(detectCycle(n, adj).hasCycle).toBe(false);
  });

  it('detects cycles and still returns a full topological order', () => {
    const n = nodes(['A', 'B', 'C']);
    const e: DagEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'C', target: 'A' },
    ];
    const adj = buildAdjacency(n, e);
    expect(detectCycle(n, adj).hasCycle).toBe(true);
    const order = topologicalOrder(n, adj);
    expect(order).toHaveLength(3);
  });

  it('finds a BFS shortest path', () => {
    const e: DagEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
      { source: 'A', target: 'C' },
    ];
    const path = findPath(e, 'A', 'C');
    expect(path?.nodeIds).toEqual(['A', 'C']);
    expect(path?.edgeIds).toEqual(['A->C']);
  });

  it('splits disconnected graphs into components', () => {
    const n = nodes(['A', 'B', 'X', 'Y']);
    const e: DagEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'X', target: 'Y' },
    ];
    const comps = connectedComponents(n, e);
    expect(comps).toHaveLength(2);
  });

  it('returns null when a path does not exist', () => {
    expect(findPath([{ source: 'A', target: 'B' }], 'B', 'A')).toBeNull();
  });
});
