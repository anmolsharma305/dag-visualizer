import { describe, expect, it } from 'vitest';
import { DagEdge, DagNode } from '../models/dag.models';
import { computeLayout } from './layered-layout';

describe('computeLayout', () => {
  it('assigns longest-path layers for a diamond plus sink', () => {
    const nodes: DagNode[] = ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id, label: id }));
    const edges: DagEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'D' },
      { source: 'C', target: 'D' },
      { source: 'D', target: 'E' },
    ];
    const layout = computeLayout(nodes, edges, { direction: 'TB' });
    const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
    expect(byId['A'].layer).toBe(0);
    expect(byId['B'].layer).toBe(1);
    expect(byId['C'].layer).toBe(1);
    expect(byId['D'].layer).toBe(2);
    expect(byId['E'].layer).toBe(3);
    expect(byId['B'].y).toBeGreaterThan(byId['A'].y);
    expect(byId['E'].y).toBeGreaterThan(byId['D'].y);
    expect(layout.edges).toHaveLength(5);
  });

  it('uses x as the main axis for left-to-right flow', () => {
    const nodes: DagNode[] = [
      { id: 'A', label: 'A' },
      { id: 'B', label: 'B' },
    ];
    const edges: DagEdge[] = [{ source: 'A', target: 'B' }];
    const layout = computeLayout(nodes, edges, { direction: 'LR' });
    const a = layout.nodes.find((n) => n.id === 'A')!;
    const b = layout.nodes.find((n) => n.id === 'B')!;
    expect(b.x).toBeGreaterThan(a.x);
  });

  it('places disjoint components in separate swimlanes', () => {
    const nodes: DagNode[] = ['A', 'B', 'X', 'Y'].map((id) => ({ id }));
    const edges: DagEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'X', target: 'Y' },
    ];
    const layout = computeLayout(nodes, edges, { direction: 'TB' });
    const a = layout.nodes.find((n) => n.id === 'A')!;
    const x = layout.nodes.find((n) => n.id === 'X')!;
    expect(Math.abs(a.x - x.x)).toBeGreaterThan(50);
  });
});
