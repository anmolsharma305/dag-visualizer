import {
  Adjacency,
  DagEdge,
  DagNode,
  GraphPath,
} from '../models/dag.models';

export function edgeId(edge: Pick<DagEdge, 'id' | 'source' | 'target'>): string {
  return edge.id ?? `${edge.source}->${edge.target}`;
}

export function buildAdjacency(nodes: DagNode[], edges: DagEdge[]): Adjacency {
  const out = new Map<string, string[]>();
  const inn = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const node of nodes) {
    out.set(node.id, []);
    inn.set(node.id, []);
    indegree.set(node.id, 0);
  }

  const seen = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!seen.has(edge.source) || !seen.has(edge.target)) {
      continue;
    }
    out.get(edge.source)!.push(edge.target);
    inn.get(edge.target)!.push(edge.source);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  return { out, in: inn, indegree };
}

export function connectedComponents(nodes: DagNode[], edges: DagEdge[]): DagNode[][] {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    let p = parent.get(id) ?? id;
    while (p !== (parent.get(p) ?? p)) {
      p = parent.get(p) ?? p;
    }
    parent.set(id, p);
    return p;
  };
  const union = (a: string, b: string) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) {
      parent.set(pa, pb);
    }
  };

  for (const node of nodes) {
    parent.set(node.id, node.id);
  }
  for (const edge of edges) {
    if (parent.has(edge.source) && parent.has(edge.target)) {
      union(edge.source, edge.target);
    }
  }

  const groups = new Map<string, DagNode[]>();
  for (const node of nodes) {
    const root = find(node.id);
    const list = groups.get(root) ?? [];
    list.push(node);
    groups.set(root, list);
  }
  return [...groups.values()];
}

export function topologicalOrder(nodes: DagNode[], adj: Adjacency): string[] {
  const indegree = new Map(adj.indegree);
  const queue: string[] = [];
  for (const node of nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }

  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.out.get(id) ?? []) {
      const nextDeg = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDeg);
      if (nextDeg === 0) {
        queue.push(next);
      }
    }
  }

  if (order.length < nodes.length) {
    const seen = new Set(order);
    for (const node of nodes) {
      if (!seen.has(node.id)) {
        order.push(node.id);
      }
    }
  }
  return order;
}

export function detectCycle(
  nodes: DagNode[],
  adj: Adjacency,
): { hasCycle: boolean; cycleNodes: string[] } {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const node of nodes) {
    color.set(node.id, WHITE);
  }

  const cycleNodes: string[] = [];

  const visit = (id: string): boolean => {
    color.set(id, GRAY);
    for (const next of adj.out.get(id) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        cycleNodes.push(id, next);
        return true;
      }
      if (c === WHITE && visit(next)) {
        cycleNodes.push(id);
        return true;
      }
    }
    color.set(id, BLACK);
    return false;
  };

  for (const node of nodes) {
    if ((color.get(node.id) ?? WHITE) === WHITE) {
      if (visit(node.id)) {
        return { hasCycle: true, cycleNodes: [...new Set(cycleNodes)] };
      }
    }
  }
  return { hasCycle: false, cycleNodes: [] };
}

export function findPath(edges: DagEdge[], from: string, to: string): GraphPath | null {
  if (from === to) {
    return { nodeIds: [from], edgeIds: [] };
  }

  const out = new Map<string, DagEdge[]>();
  for (const edge of edges) {
    const list = out.get(edge.source) ?? [];
    list.push(edge);
    out.set(edge.source, list);
  }

  const queue = [from];
  const prev = new Map<string, { node: string; edge: DagEdge }>();
  const seen = new Set<string>([from]);

  while (queue.length) {
    const id = queue.shift()!;
    for (const edge of out.get(id) ?? []) {
      if (seen.has(edge.target)) {
        continue;
      }
      seen.add(edge.target);
      prev.set(edge.target, { node: id, edge });
      if (edge.target === to) {
        const nodeIds = [to];
        const edgeIds: string[] = [];
        let cur = to;
        while (cur !== from) {
          const step = prev.get(cur)!;
          edgeIds.unshift(edgeId(step.edge));
          nodeIds.unshift(step.node);
          cur = step.node;
        }
        return { nodeIds, edgeIds };
      }
      queue.push(edge.target);
    }
  }
  return null;
}

export function childCount(id: string, adj: Adjacency): number {
  return adj.out.get(id)?.length ?? 0;
}

export function descendantCount(id: string, adj: Adjacency): number {
  const seen = new Set<string>();
  const stack = [...(adj.out.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    if (seen.has(next) || next === id) {
      continue;
    }
    seen.add(next);
    for (const child of adj.out.get(next) ?? []) {
      stack.push(child);
    }
  }
  return seen.size;
}

export function depthMap(nodes: DagNode[], adj: Adjacency): Map<string, number> {
  const depths = new Map<string, number>();
  const queue: string[] = [];
  for (const node of nodes) {
    if ((adj.indegree.get(node.id) ?? 0) === 0) {
      depths.set(node.id, 0);
      queue.push(node.id);
    }
  }
  if (queue.length === 0 && nodes.length) {
    depths.set(nodes[0].id, 0);
    queue.push(nodes[0].id);
  }
  while (queue.length) {
    const id = queue.shift()!;
    const d = depths.get(id) ?? 0;
    for (const next of adj.out.get(id) ?? []) {
      const candidate = d + 1;
      if (!depths.has(next) || candidate < (depths.get(next) ?? Infinity)) {
        depths.set(next, candidate);
        queue.push(next);
      }
    }
  }
  for (const node of nodes) {
    if (!depths.has(node.id)) {
      depths.set(node.id, 0);
    }
  }
  return depths;
}

export function visibleNodeIds(
  nodes: DagNode[],
  adj: Adjacency,
  collapsedChildIds: Set<string>,
): Set<string> | null {
  if (collapsedChildIds.size === 0) {
    return null;
  }

  const visible = new Set<string>();
  const stack: string[] = [];
  for (const node of nodes) {
    if ((adj.indegree.get(node.id) ?? 0) === 0) {
      stack.push(node.id);
    }
  }
  if (stack.length === 0) {
    for (const node of nodes) {
      stack.push(node.id);
    }
  }

  while (stack.length) {
    const id = stack.pop()!;
    if (visible.has(id)) {
      continue;
    }
    visible.add(id);
    if (collapsedChildIds.has(id)) {
      continue;
    }
    for (const child of adj.out.get(id) ?? []) {
      stack.push(child);
    }
  }
  return visible;
}

export function normalizeContent(node: DagNode) {
  if (!node.content) {
    return [];
  }
  return Array.isArray(node.content) ? node.content : [node.content];
}
