import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DagIconComponent } from '../icons/dag-icon';
import {
  DagContentBlock,
  DagContentEvent,
  DagDirection,
  DagEdge,
  DagLayout,
  DagMinimapPosition,
  DagNode,
  DagNodeRun,
  DagNodeStatus,
  DagOptions,
  GraphData,
  LayoutEdge,
  LayoutNode,
  LodLevel,
  ResolvedDagOptions,
  ViewBox,
} from '../../models/dag.models';
import {
  buildAdjacency,
  childCount,
  depthMap,
  descendantCount,
  findPath,
  visibleNodeIds as computeVisibleIds,
} from '../../layout/graph-utils';
import {
  computeLayout,
  resolveOptions,
  routeEdges,
} from '../../layout/layered-layout';
import { contentBlocksFor, expandedHeightFor, expandedWidthFor, kvItems } from '../../layout/content-size';
import { lerp } from '../../animation/easing';
import { tween, TweenHandle } from '../../animation/tween';
import { GraphStore } from '../../state/graph-store';

@Component({
  selector: 'ngx-dag',
  exportAs: 'ngxDag',
  imports: [NgTemplateOutlet, DagIconComponent],
  templateUrl: './dag-viewer.html',
  styleUrl: './dag-viewer.css',
  host: {
    class: 'ngx-dag',
    '[class.ngx-dag--dark]': 'isDark()',
    '[class.ngx-dag--bordered]': 'mergedOptions().bordered',
    '[class.ngx-dag--fullscreen]': 'isFullscreen()',
    '[class.ngx-dag--vertical]': "mergedOptions().direction === 'TB' || mergedOptions().direction === 'BT'",
    '[class.ngx-dag--horizontal]': "mergedOptions().direction === 'LR' || mergedOptions().direction === 'RL'",
    '(keydown)': 'onKeydown($event)',
    tabindex: '0',
  },
})
export class DagViewerComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly nodes = input<DagNode[]>([]);
  readonly edges = input<DagEdge[]>([]);
  readonly options = input<DagOptions | undefined>(undefined);
  readonly detailTemplate = input<TemplateRef<unknown> | null>(null);
  readonly graphTitle = input('');
  readonly showPropertyPanel = input(true);
  readonly runState = input<Record<string, DagNodeRun>>({});
  readonly autoRun = input(false);
  readonly stepDuration = input(900);

  readonly nodeClick = output<LayoutNode>();
  readonly nodeExpand = output<LayoutNode>();
  readonly edgeClick = output<LayoutEdge>();
  readonly graphChange = output<GraphData>();
  readonly statusChange = output<{ id: string; status: DagNodeStatus }>();
  readonly runComplete = output<void>();
  readonly contentEvent = output<DagContentEvent>();

  readonly store = new GraphStore();
  readonly collapsedChildIds = signal(new Set<string>());
  readonly expandedIds = signal(new Set<string>());
  readonly panelOverrides = signal<Partial<DagOptions>>({});
  readonly searchQuery = signal('');
  readonly searchCaseSensitive = signal(false);
  readonly searchWholeWord = signal(false);
  readonly matchIndex = signal(0);
  readonly selectedId = signal<string | null>(null);
  readonly settingsOpen = signal(false);
  readonly traceOpen = signal(false);
  readonly traceFrom = signal('');
  readonly traceTo = signal('');
  readonly tracedNodeIds = signal(new Set<string>());
  readonly tracedEdgeIds = signal(new Set<string>());
  readonly isFullscreen = signal(false);
  readonly renderNodes = signal<LayoutNode[]>([]);
  readonly renderEdges = signal<LayoutEdge[]>([]);
  readonly viewBox = signal<ViewBox>({ x: 0, y: 0, w: 800, h: 480 });
  readonly stageSize = signal({ w: 800, h: 480 });
  readonly simState = signal<Record<string, DagNodeRun>>({});
  readonly simPlaying = signal(false);

  readonly stageEl = viewChild<ElementRef<HTMLElement>>('stage');
  readonly svgEl = viewChild<ElementRef<SVGSVGElement>>('svg');
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly mergedOptions = computed(() =>
    resolveOptions({ ...this.options(), ...this.panelOverrides() }),
  );
  readonly isDark = computed(() => this.mergedOptions().theme === 'dark');

  private readonly adj = computed(() =>
    buildAdjacency(this.store.nodes(), this.store.edges()),
  );

  readonly visibleNodeIds = computed(() =>
    computeVisibleIds(this.store.nodes(), this.adj(), this.collapsedChildIds()),
  );

  readonly layout = computed(() => {
    const expanded = this.expandedIds();
    const visible = this.visibleNodeIds();
    let nodes = this.store.nodes();
    let edges = this.store.edges();
    if (visible) {
      nodes = nodes.filter((n) => visible.has(n.id));
      edges = edges.filter((e) => visible.has(e.source) && visible.has(e.target));
    }
    if (expanded.size > 0) {
      nodes = nodes.map((n) =>
        expanded.has(n.id)
          ? { ...n, width: expandedWidthFor(n), height: expandedHeightFor(n) }
          : n,
      );
    }
    return computeLayout(nodes, edges, this.mergedOptions());
  });

  readonly viewBoxString = computed(() => {
    const v = this.viewBox();
    return `${v.x} ${v.y} ${v.w} ${v.h}`;
  });

  readonly renderScale = computed(() => {
    const stage = this.stageSize();
    const vb = this.viewBox();
    return stage.w / Math.max(vb.w, 1);
  });

  readonly lod = computed<LodLevel>(() => {
    const s = this.renderScale();
    if (s < 0.45) {
      return 'far';
    }
    if (s < 0.75) {
      return 'mid';
    }
    return 'near';
  });

  readonly searchMatches = computed(() => {
    const raw = this.searchQuery().trim();
    if (!raw) {
      return [];
    }
    const sensitive = this.searchCaseSensitive();
    const whole = this.searchWholeWord();
    const needle = sensitive ? raw : raw.toLowerCase();
    return this.renderNodes().filter((n) => {
      const fields = [n.label, n.subtitle ?? '', n.id];
      return fields.some((field) => {
        const hay = sensitive ? field : field.toLowerCase();
        return whole ? hay === needle : hay.includes(needle);
      });
    });
  });

  readonly visibleNodeCount = computed(() => this.renderNodes().length);
  readonly totalNodeCount = computed(() => this.store.nodes().length);

  readonly selectedNode = computed(() => {
    const id = this.selectedId();
    return this.store.nodes().find((n) => n.id === id) ?? null;
  });

  readonly minimapPos = computed<DagMinimapPosition>(
    () => this.mergedOptions().minimapPosition,
  );

  readonly minimapIndicator = computed(() => {
    const layout = this.layout();
    const vb = this.viewBox();
    const w = Math.max(layout.width, 1);
    const h = Math.max(layout.height, 1);
    return {
      x: (vb.x / w) * 100,
      y: (vb.y / h) * 100,
      w: (vb.w / w) * 100,
      h: (vb.h / h) * 100,
    };
  });

  readonly kvItems = kvItems;
  readonly contentBlocksFor = contentBlocksFor;

  private autoFit = true;
  private panning = false;
  private panStart = { x: 0, y: 0, vbX: 0, vbY: 0 };
  private activeTween: TweenHandle | null = null;
  private simTween: TweenHandle | null = null;
  private viewTween: TweenHandle | null = null;
  private simTimer: ReturnType<typeof setTimeout> | null = null;
  private didFit = false;
  private seeded = false;

  constructor() {
    effect(() => {
      const nodes = this.nodes();
      const edges = this.edges();
      untracked(() => {
        this.store.seed(nodes, edges);
        this.seeded = true;
        const depth = this.options()?.defaultCollapseDepth;
        if (depth != null && Number.isFinite(depth)) {
          this.collapseToDepth(depth);
        } else {
          this.collapsedChildIds.set(new Set());
        }
      });
    });

    effect(() => {
      const layout = this.layout();
      untracked(() => {
        this.transitionTo(layout);
        if (!this.didFit && layout.nodes.length) {
          this.didFit = true;
          this.fitToContent(false);
        }
      });
    });

    effect(() => {
      this.store.nodes();
      this.store.edges();
      untracked(() => {
        if (this.seeded) {
          this.graphChange.emit(this.store.toJSON());
        }
      });
    });

    effect(() => {
      if (this.autoRun() && this.store.nodes().length && !this.simPlaying()) {
        untracked(() => this.play());
      }
    });

    afterNextRender(() => {
      const stage = this.stageEl()?.nativeElement;
      if (!stage) {
        return;
      }
      const ro = new ResizeObserver(() => this.measure());
      ro.observe(stage);
      this.measure();
      this.destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  merged(): ResolvedDagOptions {
    return this.mergedOptions();
  }

  runOf(id: string): DagNodeRun | undefined {
    return this.runState()[id] ?? this.simState()[id];
  }

  statusOf(id: string): DagNodeStatus {
    return this.runOf(id)?.status ?? 'idle';
  }

  progressPct(id: string): number {
    const run = this.runOf(id);
    if (!run || run.progress == null) {
      return run?.status === 'running' ? 50 : run?.status === 'success' ? 100 : 0;
    }
    return Math.round(run.progress * 100);
  }

  edgeFlowing(edge: LayoutEdge): boolean {
    const ss = this.statusOf(edge.source);
    const ts = this.statusOf(edge.target);
    return ss === 'success' && (ts === 'running' || ts === 'pending');
  }

  edgeDone(edge: LayoutEdge): boolean {
    return this.statusOf(edge.source) === 'success' && this.statusOf(edge.target) === 'success';
  }

  childCountOf(id: string): number {
    return childCount(id, this.adj());
  }

  descendantCountOf(id: string): number {
    return descendantCount(id, this.adj());
  }

  isChildrenCollapsed(id: string): boolean {
    return this.collapsedChildIds().has(id);
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleChildren(id: string, event?: Event): void {
    event?.stopPropagation();
    const next = new Set(this.collapsedChildIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.collapsedChildIds.set(next);
  }

  expandAll(): void {
    this.collapsedChildIds.set(new Set());
  }

  collapseAll(): void {
    this.collapseToDepth(1);
  }

  collapseToDepth(depth: number): void {
    const depths = depthMap(this.store.nodes(), this.adj());
    const next = new Set<string>();
    for (const n of this.store.nodes()) {
      if ((depths.get(n.id) ?? 0) >= depth && this.childCountOf(n.id) > 0) {
        next.add(n.id);
      }
    }
    this.collapsedChildIds.set(next);
  }

  expandNode(id: string): void {
    const next = new Set(this.expandedIds());
    next.add(id);
    this.expandedIds.set(next);
    const layoutNode = this.renderNodes().find((n) => n.id === id);
    if (layoutNode) {
      this.nodeExpand.emit(layoutNode);
    }
  }

  collapseNode(id: string): void {
    const next = new Set(this.expandedIds());
    next.delete(id);
    this.expandedIds.set(next);
  }

  toggleNodeExpand(id: string, event?: Event): void {
    event?.stopPropagation();
    if (this.isExpanded(id)) {
      this.collapseNode(id);
    } else {
      this.expandNode(id);
    }
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.matchIndex.set(0);
  }

  toggleCaseSensitive(): void {
    this.searchCaseSensitive.update((v) => !v);
    this.matchIndex.set(0);
  }

  toggleWholeWord(): void {
    this.searchWholeWord.update((v) => !v);
    this.matchIndex.set(0);
  }

  exportGraph(): void {
    const blob = new Blob([JSON.stringify(this.toJSON(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dag-graph.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  openImport(): void {
    this.fileInput()?.nativeElement.click();
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as GraphData;
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          return;
        }
        this.fromJSON(data);
      } catch {
        /* ignore invalid JSON */
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  focusMatches(): void {
    const matches = this.searchMatches();
    if (!matches.length) {
      this.fitToContent();
      return;
    }
    const i = this.matchIndex() % matches.length;
    this.focusNodeIds([matches[i].id]);
  }

  nextMatch(): void {
    const matches = this.searchMatches();
    if (!matches.length) {
      return;
    }
    this.matchIndex.update((i) => (i + 1) % matches.length);
    this.focusMatches();
  }

  selectNode(node: LayoutNode, event?: Event): void {
    event?.stopPropagation();
    this.selectedId.set(node.id);
    this.nodeClick.emit(node);
  }

  selectEdge(edge: LayoutEdge, event?: Event): void {
    event?.stopPropagation();
    this.edgeClick.emit(edge);
  }

  tracePath(fromId: string, toId: string): boolean {
    const path = findPath(this.store.edges(), fromId, toId);
    if (!path) {
      this.tracedNodeIds.set(new Set());
      this.tracedEdgeIds.set(new Set());
      return false;
    }
    this.tracedNodeIds.set(new Set(path.nodeIds));
    this.tracedEdgeIds.set(new Set(path.edgeIds));
    this.focusNodeIds(path.nodeIds);
    return true;
  }

  setTraceFrom(event: Event): void {
    this.traceFrom.set((event.target as HTMLSelectElement).value);
  }

  setTraceTo(event: Event): void {
    this.traceTo.set((event.target as HTMLSelectElement).value);
  }

  applyTrace(): void {
    this.tracePath(this.traceFrom(), this.traceTo());
    this.traceOpen.set(false);
  }

  clearTrace(): void {
    this.tracedNodeIds.set(new Set());
    this.tracedEdgeIds.set(new Set());
    this.traceFrom.set('');
    this.traceTo.set('');
  }

  zoomIn(): void {
    this.zoomAt(1.17);
  }

  zoomOut(): void {
    this.zoomAt(1 / 1.2);
  }

  fitToContent(animate = true): void {
    this.autoFit = true;
    const layout = this.layout();
    const stage = this.stageSize();
    const pad = 24;
    const w = Math.max(layout.width, 1);
    const h = Math.max(layout.height, 1);
    const scale = Math.min(stage.w / (w + pad * 2), stage.h / (h + pad * 2));
    const vw = stage.w / Math.max(scale, 0.01);
    const vh = stage.h / Math.max(scale, 0.01);
    const target: ViewBox = {
      x: (w - vw) / 2,
      y: (h - vh) / 2,
      w: vw,
      h: vh,
    };
    if (animate) {
      this.animateViewBox(target);
    } else {
      this.viewBox.set(target);
    }
  }

  center(): void {
    const layout = this.layout();
    const vb = this.viewBox();
    this.animateViewBox({
      ...vb,
      x: (layout.width - vb.w) / 2,
      y: (layout.height - vb.h) / 2,
    });
  }

  toggleFullscreen(): void {
    const host = this.stageEl()?.nativeElement?.closest('.ngx-dag') as HTMLElement | null;
    if (!host) {
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      this.isFullscreen.set(false);
    } else {
      void host.requestFullscreen();
      this.isFullscreen.set(true);
    }
  }

  toggleMinimap(): void {
    this.patchOptions({ showMinimap: !this.mergedOptions().showMinimap });
  }

  toggleSettings(): void {
    this.settingsOpen.update((v) => !v);
  }

  patchOptions(patch: Partial<DagOptions>): void {
    this.panelOverrides.update((cur) => ({ ...cur, ...patch }));
  }

  setDirection(direction: DagDirection): void {
    this.patchOptions({ direction });
  }

  onGapInput(key: 'nodeWidth' | 'nodeHeight' | 'nodeGap' | 'layerGap', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.patchOptions({ [key]: value });
  }

  play(): void {
    this.pause();
    const nodes = this.store.nodes();
    const adj = this.adj();
    const state: Record<string, DagNodeRun> = {};
    for (const n of nodes) {
      const pending = (adj.indegree.get(n.id) ?? 0) > 0;
      state[n.id] = { status: pending ? 'pending' : 'idle' };
    }
    this.simState.set(state);
    this.simPlaying.set(true);
    this.tickSim();
  }

  pause(): void {
    this.simPlaying.set(false);
    this.simTween?.cancel();
    if (this.simTimer) {
      clearTimeout(this.simTimer);
      this.simTimer = null;
    }
  }

  resetRun(): void {
    this.pause();
    this.simState.set({});
  }

  failNode(id: string, message = 'Failed'): void {
    this.patchSim(id, { status: 'failed', message, progress: 1 });
    this.statusChange.emit({ id, status: 'failed' });
  }

  addNode(partial?: Partial<DagNode>): string {
    return this.store.addNode(partial);
  }

  addChild(parentId: string, partial?: Partial<DagNode>): string {
    return this.store.addChild(parentId, partial);
  }

  updateNode(id: string, patch: Partial<DagNode>): void {
    this.store.updateNode(id, patch);
  }

  removeNode(id: string): void {
    this.store.removeNode(id);
    if (this.selectedId() === id) {
      this.selectedId.set(null);
    }
  }

  addEdge(edge: DagEdge): void {
    this.store.addEdge(edge);
  }

  removeEdge(id: string): void {
    this.store.removeEdge(id);
  }

  undo(): void {
    this.store.undo();
  }

  redo(): void {
    this.store.redo();
  }

  toJSON(): GraphData {
    return this.store.toJSON();
  }

  fromJSON(data: GraphData): void {
    this.store.fromJSON(data);
    const depth = this.mergedOptions().defaultCollapseDepth;
    if (Number.isFinite(depth)) {
      this.collapseToDepth(depth);
    } else {
      this.collapsedChildIds.set(new Set());
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1 / 1.12 : 1.12;
    const svg = this.svgEl()?.nativeElement;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    this.zoomAt(factor, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }

  onPointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('.node-card, .chip, .toolbar, .panel')) {
      return;
    }
    this.panning = true;
    this.autoFit = false;
    this.panStart = {
      x: event.clientX,
      y: event.clientY,
      vbX: this.viewBox().x,
      vbY: this.viewBox().y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.panning) {
      return;
    }
    const svg = this.svgEl()?.nativeElement;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const vb = this.viewBox();
    const dx = ((event.clientX - this.panStart.x) / rect.width) * vb.w;
    const dy = ((event.clientY - this.panStart.y) / rect.height) * vb.h;
    this.viewBox.set({ ...vb, x: this.panStart.vbX - dx, y: this.panStart.vbY - dy });
  }

  onPointerUp(): void {
    this.panning = false;
  }

  onMinimapClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const layout = this.layout();
    const vb = this.viewBox();
    const x = ((event.clientX - rect.left) / rect.width) * layout.width - vb.w / 2;
    const y = ((event.clientY - rect.top) / rect.height) * layout.height - vb.h / 2;
    this.autoFit = false;
    this.animateViewBox({ ...vb, x, y });
  }

  onKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return;
    }
    const vb = this.viewBox();
    const step = vb.w * 0.08;
    if (event.key === 'ArrowLeft') {
      this.viewBox.set({ ...vb, x: vb.x - step });
    } else if (event.key === 'ArrowRight') {
      this.viewBox.set({ ...vb, x: vb.x + step });
    } else if (event.key === 'ArrowUp') {
      this.viewBox.set({ ...vb, y: vb.y - step });
    } else if (event.key === 'ArrowDown') {
      this.viewBox.set({ ...vb, y: vb.y + step });
    } else if (event.key === '+' || event.key === '=') {
      this.zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      this.zoomOut();
    } else if (event.key === 'f') {
      this.fitToContent();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    }
  }

  onLink(nodeId: string, href: string, event: Event): void {
    event.preventDefault();
    this.contentEvent.emit({ nodeId, action: 'link', payload: { href } });
  }

  onFormSubmit(nodeId: string, event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const payload: Record<string, FormDataEntryValue> = {};
    new FormData(form).forEach((value, key) => {
      payload[key] = value;
    });
    this.contentEvent.emit({ nodeId, action: 'form-submit', payload });
  }

  onLabelEdit(id: string, event: Event): void {
    this.updateNode(id, { label: (event.target as HTMLInputElement).value });
  }

  addSelectedChild(): void {
    const id = this.selectedId();
    if (id) {
      this.addChild(id, { label: 'New step' });
    } else {
      this.addNode({ label: 'New step' });
    }
  }

  deleteSelected(): void {
    const id = this.selectedId();
    if (id) {
      this.removeNode(id);
    }
  }

  isMatch(id: string): boolean {
    return this.searchMatches().some((n) => n.id === id);
  }

  isTracedNode(id: string): boolean {
    return this.tracedNodeIds().has(id);
  }

  isTracedEdge(id: string): boolean {
    return this.tracedEdgeIds().has(id);
  }

  blocksOf(node: LayoutNode): DagContentBlock[] {
    const raw = this.store.nodes().find((n) => n.id === node.id);
    return raw ? contentBlocksFor(raw) : [];
  }

  private measure(): void {
    const el = this.stageEl()?.nativeElement;
    if (!el) {
      return;
    }
    const w = Math.max(el.clientWidth, 1);
    const h = Math.max(el.clientHeight, 1);
    this.stageSize.set({ w, h });
    if (this.autoFit) {
      this.fitToContent(false);
    }
  }

  private zoomAt(factor: number, pointer?: { x: number; y: number }): void {
    this.autoFit = false;
    this.viewTween?.cancel();
    const vb = this.viewBox();
    const stage = this.stageSize();
    const px = pointer?.x ?? stage.w / 2;
    const py = pointer?.y ?? stage.h / 2;
    const worldX = vb.x + (px / stage.w) * vb.w;
    const worldY = vb.y + (py / stage.h) * vb.h;
    const newW = Math.min(Math.max(vb.w / factor, 40), 20000);
    const newH = newW * (stage.h / stage.w);
    this.viewBox.set({
      w: newW,
      h: newH,
      x: worldX - (px / stage.w) * newW,
      y: worldY - (py / stage.h) * newH,
    });
  }

  private focusNodeIds(ids: string[]): void {
    const nodes = this.renderNodes().filter((n) => ids.includes(n.id));
    if (!nodes.length) {
      return;
    }
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    const pad = 80;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    this.autoFit = false;
    this.animateViewBox({ x: minX - pad, y: minY - pad, w, h });
  }

  private animateViewBox(target: ViewBox): void {
    this.viewTween?.cancel();
    const from = this.viewBox();
    const opts = this.mergedOptions();
    if (!opts.animate) {
      this.viewBox.set(target);
      return;
    }
    this.viewTween = tween({
      duration: opts.animationDuration,
      onUpdate: (p) => {
        this.viewBox.set({
          x: lerp(from.x, target.x, p),
          y: lerp(from.y, target.y, p),
          w: lerp(from.w, target.w, p),
          h: lerp(from.h, target.h, p),
        });
      },
    });
  }

  private transitionTo(target: DagLayout): void {
    this.activeTween?.cancel();
    const opts = this.mergedOptions();
    const prev = this.renderNodes();
    if (!opts.animate || !prev.length) {
      this.renderNodes.set(target.nodes);
      this.renderEdges.set(target.edges);
      return;
    }
    const prevMap = new Map(prev.map((n) => [n.id, n]));
    const pairs = target.nodes.map((tg) => ({ target: tg, from: prevMap.get(tg.id) ?? tg }));
    this.activeTween = tween({
      duration: opts.animationDuration,
      onUpdate: (p) => {
        const frame = pairs.map(({ target: tg, from: src }) => ({
          ...tg,
          x: lerp(src.x, tg.x, p),
          y: lerp(src.y, tg.y, p),
          width: lerp(src.width, tg.width, p),
          height: lerp(src.height, tg.height, p),
        }));
        this.renderNodes.set(frame);
        this.renderEdges.set(routeEdges(frame, this.visibleEdges(), opts.direction));
      },
      onComplete: () => {
        this.renderNodes.set(target.nodes);
        this.renderEdges.set(target.edges);
      },
    });
  }

  private visibleEdges(): DagEdge[] {
    const visible = this.visibleNodeIds();
    const edges = this.store.edges();
    if (!visible) {
      return edges;
    }
    return edges.filter((e) => visible.has(e.source) && visible.has(e.target));
  }

  private patchSim(id: string, run: DagNodeRun): void {
    this.simState.update((s) => ({ ...s, [id]: run }));
  }

  private tickSim(): void {
    if (!this.simPlaying()) {
      return;
    }
    const adj = this.adj();
    const state = { ...this.simState() };
    const duration = Math.max(120, this.stepDuration());

    const ready = this.store.nodes().filter((n) => {
      const st = state[n.id]?.status ?? 'idle';
      if (st === 'running' || st === 'success' || st === 'failed' || st === 'skipped') {
        return false;
      }
      const parents = adj.in.get(n.id) ?? [];
      return parents.every((p) => state[p]?.status === 'success') || parents.length === 0;
    });

    if (!ready.length) {
      const allDone = this.store.nodes().every((n) => {
        const st = state[n.id]?.status;
        return st === 'success' || st === 'failed' || st === 'skipped' || st === 'cancelled';
      });
      if (allDone) {
        this.simPlaying.set(false);
        this.runComplete.emit();
      }
      return;
    }

    const node = ready[0];
    this.patchSim(node.id, { status: 'running', progress: 0, message: 'Processing...' });
    this.statusChange.emit({ id: node.id, status: 'running' });

    this.simTween?.cancel();
    this.simTween = tween({
      duration,
      easing: (t) => t,
      onUpdate: (p) => {
        this.patchSim(node.id, { status: 'running', progress: p, message: 'Processing...' });
      },
      onComplete: () => {
        this.patchSim(node.id, { status: 'success', progress: 1, message: '' });
        this.statusChange.emit({ id: node.id, status: 'success' });
        this.simTimer = setTimeout(() => this.tickSim(), 80);
      },
    });
  }
}
