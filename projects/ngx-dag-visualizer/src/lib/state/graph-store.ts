import { signal } from '@angular/core';
import { DagEdge, DagNode, GraphData } from '../models/dag.models';
import { History } from './history';

function cloneGraph(nodes: DagNode[], edges: DagEdge[]): GraphData {
  return {
    nodes: nodes.map((n) => ({ ...n })),
    edges: edges.map((e) => ({ ...e })),
  };
}

export class GraphStore {
  readonly nodes = signal<DagNode[]>([]);
  readonly edges = signal<DagEdge[]>([]);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  private readonly history = new History<GraphData>();
  private seq = 0;

  seed(nodes: DagNode[], edges: DagEdge[]): void {
    this.history.clear();
    this.nodes.set(nodes.map((n) => ({ ...n })));
    this.edges.set(edges.map((e) => ({ ...e })));
    this.syncFlags();
  }

  toJSON(): GraphData {
    return cloneGraph(this.nodes(), this.edges());
  }

  fromJSON(data: GraphData): void {
    this.history.clear();
    this.nodes.set(data.nodes.map((n) => ({ ...n })));
    this.edges.set(data.edges.map((e) => ({ ...e })));
    this.syncFlags();
  }

  addNode(partial: Partial<DagNode> = {}): string {
    const id = partial.id ?? `node-${++this.seq}`;
    this.mutate(() => {
      this.nodes.update((list) => [
        ...list,
        {
          id,
          label: partial.label ?? 'New node',
          subtitle: partial.subtitle,
          accent: partial.accent,
          data: partial.data,
          content: partial.content,
          width: partial.width,
          height: partial.height,
        },
      ]);
    });
    return id;
  }

  addChild(parentId: string, partial: Partial<DagNode> = {}): string {
    const id = this.addNode(partial);
    this.addEdge({ source: parentId, target: id });
    return id;
  }

  updateNode(id: string, patch: Partial<DagNode>): void {
    this.mutate(() => {
      this.nodes.update((list) => list.map((n) => (n.id === id ? { ...n, ...patch, id } : n)));
    });
  }

  removeNode(id: string): void {
    this.mutate(() => {
      this.nodes.update((list) => list.filter((n) => n.id !== id));
      this.edges.update((list) => list.filter((e) => e.source !== id && e.target !== id));
    });
  }

  addEdge(edge: DagEdge): void {
    this.mutate(() => {
      this.edges.update((list) => [...list, { ...edge }]);
    });
  }

  removeEdge(id: string): void {
    this.mutate(() => {
      this.edges.update((list) =>
        list.filter((e) => (e.id ?? `${e.source}->${e.target}`) !== id),
      );
    });
  }

  undo(): void {
    const prev = this.history.undo(this.toJSON());
    if (!prev) {
      return;
    }
    this.nodes.set(prev.nodes);
    this.edges.set(prev.edges);
    this.syncFlags();
  }

  redo(): void {
    const next = this.history.redo(this.toJSON());
    if (!next) {
      return;
    }
    this.nodes.set(next.nodes);
    this.edges.set(next.edges);
    this.syncFlags();
  }

  private mutate(fn: () => void): void {
    this.history.pushUndo(this.toJSON());
    fn();
    this.syncFlags();
  }

  private syncFlags(): void {
    this.canUndo.set(this.history.canUndo);
    this.canRedo.set(this.history.canRedo);
  }
}
