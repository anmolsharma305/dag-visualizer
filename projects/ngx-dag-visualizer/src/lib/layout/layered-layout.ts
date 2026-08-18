import {
  DagDirection,
  DagEdge,
  DagLayout,
  DagNode,
  DagOptions,
  DEFAULT_DAG_OPTIONS,
  LayoutEdge,
  LayoutNode,
  ResolvedDagOptions,
} from '../models/dag.models';
import { buildAdjacency, connectedComponents, edgeId, topologicalOrder } from './graph-utils';

export function resolveOptions(options?: DagOptions): ResolvedDagOptions {
  return { ...DEFAULT_DAG_OPTIONS, ...options };
}

export function isVerticalDirection(direction: DagDirection): boolean {
  return direction === 'TB' || direction === 'BT';
}

export function isFlippedDirection(direction: DagDirection): boolean {
  return direction === 'BT' || direction === 'RL';
}

export function edgeGeometry(
  source: Pick<LayoutNode, 'x' | 'y' | 'width' | 'height'>,
  target: Pick<LayoutNode, 'x' | 'y' | 'width' | 'height'>,
  direction: DagDirection,
): { path: string; labelX: number; labelY: number } {
  const vertical = isVerticalDirection(direction);
  const flipped = isFlippedDirection(direction);

  let sx: number;
  let sy: number;
  let tx: number;
  let ty: number;

  if (vertical) {
    sx = source.x + source.width / 2;
    tx = target.x + target.width / 2;
    if (flipped) {
      sy = source.y;
      ty = target.y + target.height;
    } else {
      sy = source.y + source.height;
      ty = target.y;
    }
  } else {
    sy = source.y + source.height / 2;
    ty = target.y + target.height / 2;
    if (flipped) {
      sx = source.x;
      tx = target.x + target.width;
    } else {
      sx = source.x + source.width;
      tx = target.x;
    }
  }

  const dx = tx - sx;
  const dy = ty - sy;
  let c1x: number;
  let c1y: number;
  let c2x: number;
  let c2y: number;
  if (vertical) {
    const lift = dy * 0.45;
    c1x = sx;
    c1y = sy + lift;
    c2x = tx;
    c2y = ty - lift;
  } else {
    const lift = dx * 0.45;
    c1x = sx + lift;
    c1y = sy;
    c2x = tx - lift;
    c2y = ty;
  }

  const path = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
  return {
    path,
    labelX: (sx + tx) / 2,
    labelY: (sy + ty) / 2,
  };
}

export function routeEdges(
  nodes: LayoutNode[],
  edges: DagEdge[],
  direction: DagDirection,
): LayoutEdge[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const result: LayoutEdge[] = [];
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) {
      continue;
    }
    const geom = edgeGeometry(source, target, direction);
    result.push({
      id: edgeId(edge),
      source: edge.source,
      target: edge.target,
      label: edge.label,
      data: edge.data,
      ...geom,
    });
  }
  return result;
}

interface ComponentLayout {
  nodes: LayoutNode[];
  crossExtent: number;
  mainExtent: number;
}

function sizeOf(node: DagNode, opts: ResolvedDagOptions): { w: number; h: number } {
  return {
    w: node.width ?? opts.nodeWidth,
    h: node.height ?? opts.nodeHeight,
  };
}

function assignLayers(
  nodes: DagNode[],
  out: Map<string, string[]>,
  order: string[],
): Map<string, number> {
  const layer = new Map<string, number>();
  for (const node of nodes) {
    layer.set(node.id, 0);
  }
  for (const id of order) {
    const base = layer.get(id) ?? 0;
    for (const next of out.get(id) ?? []) {
      layer.set(next, Math.max(layer.get(next) ?? 0, base + 1));
    }
  }
  return layer;
}

function layoutComponent(nodes: DagNode[], edges: DagEdge[], opts: ResolvedDagOptions): ComponentLayout {
  const adj = buildAdjacency(nodes, edges);
  const order = topologicalOrder(nodes, adj);
  const layerOf = assignLayers(nodes, adj.out, order);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  let maxLayer = 0;
  for (const value of layerOf.values()) {
    maxLayer = Math.max(maxLayer, value);
  }
  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const id of order) {
    layers[layerOf.get(id) ?? 0].push(id);
  }

  const vertical = isVerticalDirection(opts.direction);
  const layerCross: number[] = [];
  const layerMainSize: number[] = [];

  layers.forEach((ids) => {
    let cross = 0;
    let main = 0;
    ids.forEach((id, i) => {
      const { w, h } = sizeOf(byId.get(id)!, opts);
      const crossSize = vertical ? w : h;
      const mainSize = vertical ? h : w;
      cross += crossSize + (i > 0 ? opts.nodeGap : 0);
      main = Math.max(main, mainSize);
    });
    layerCross.push(cross);
    layerMainSize.push(main);
  });

  const maxCross = Math.max(0, ...layerCross);
  const layerMainStart: number[] = [0];
  for (let i = 1; i < layers.length; i++) {
    layerMainStart[i] = layerMainStart[i - 1] + layerMainSize[i - 1] + opts.layerGap;
  }

  const placed: LayoutNode[] = [];
  layers.forEach((ids, l) => {
    let crossCursor = (maxCross - (layerCross[l] ?? 0)) / 2;
    ids.forEach((id, orderInLayer) => {
      const node = byId.get(id)!;
      const { w, h } = sizeOf(node, opts);
      const mainStart = layerMainStart[l];
      const mainCenterOffset = (layerMainSize[l] - (vertical ? h : w)) / 2;
      let x: number;
      let y: number;
      if (vertical) {
        x = crossCursor;
        y = mainStart + mainCenterOffset;
      } else {
        x = mainStart + mainCenterOffset;
        y = crossCursor;
      }
      placed.push({
        id: node.id,
        label: node.label ?? node.id,
        subtitle: node.subtitle,
        accent: node.accent,
        x,
        y,
        width: w,
        height: h,
        layer: l,
        order: orderInLayer,
        data: node.data,
        content: node.content,
      });
      crossCursor += (vertical ? w : h) + opts.nodeGap;
    });
  });

  const last = layers.length - 1;
  const mainExtent =
    last >= 0 ? layerMainStart[last] + layerMainSize[last] : opts.nodeHeight;

  return {
    nodes: placed,
    crossExtent: maxCross,
    mainExtent,
  };
}

export function computeLayout(
  nodes: DagNode[],
  edges: DagEdge[],
  options?: DagOptions,
): DagLayout {
  const opts = resolveOptions(options);
  const vertical = isVerticalDirection(opts.direction);
  const components = connectedComponents(nodes, edges);
  const componentGap = opts.layerGap;

  const allNodes: LayoutNode[] = [];
  let crossOffset = opts.padding;
  let maxMainExtent = 0;

  for (const component of components) {
    const ids = new Set(component.map((n) => n.id));
    const localEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    const local = layoutComponent(component, localEdges, opts);

    for (const node of local.nodes) {
      if (vertical) {
        node.x += crossOffset;
        node.y += opts.padding;
      } else {
        node.x += opts.padding;
        node.y += crossOffset;
      }
      allNodes.push(node);
    }

    maxMainExtent = Math.max(maxMainExtent, local.mainExtent);
    crossOffset += local.crossExtent + componentGap;
  }

  const totalCross = components.length ? crossOffset - componentGap + opts.padding : opts.padding * 2;
  const totalMain = maxMainExtent + opts.padding * 2;

  if (isFlippedDirection(opts.direction)) {
    for (const node of allNodes) {
      if (vertical) {
        node.y = totalMain - node.y - node.height;
      } else {
        node.x = totalMain - node.x - node.width;
      }
    }
  }

  const width = vertical ? totalCross : totalMain;
  const height = vertical ? totalMain : totalCross;
  const laidEdges = routeEdges(allNodes, edges, opts.direction);

  return { nodes: allNodes, edges: laidEdges, width, height };
}
