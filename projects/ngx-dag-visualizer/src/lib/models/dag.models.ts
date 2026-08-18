export type DagDirection = 'TB' | 'BT' | 'LR' | 'RL';
export type DagTheme = 'light' | 'dark';
export type DagMinimapPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

export type DagNodeStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface DagNodeRun {
  status: DagNodeStatus;
  progress?: number;
  message?: string;
}

export interface DagFormField {
  name: string;
  label?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  value?: string | number | boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export type DagContentBlock =
  | { type: 'text'; text: string; muted?: boolean; bold?: boolean }
  | { type: 'html'; html: string }
  | { type: 'image'; src: string; alt?: string; height?: number; fit?: 'cover' | 'contain' }
  | {
      type: 'video';
      src: string;
      provider?: 'youtube' | 'vimeo' | 'file';
      title?: string;
      height?: number;
    }
  | { type: 'table'; columns?: string[]; rows: (string | number)[][] }
  | { type: 'keyValue'; items: Record<string, string | number> | { key: string; value: string | number }[] }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'link'; href: string; label?: string; external?: boolean }
  | { type: 'website'; src: string; title?: string; height?: number }
  | { type: 'form'; fields: DagFormField[]; submitLabel?: string };

export interface DagNode {
  id: string;
  label?: string;
  subtitle?: string;
  accent?: string;
  width?: number;
  height?: number;
  data?: unknown;
  content?: DagContentBlock | DagContentBlock[];
  expandedWidth?: number;
  expandedHeight?: number;
}

export interface DagEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  data?: unknown;
}

export interface GraphData {
  nodes: DagNode[];
  edges: DagEdge[];
}

export interface DagOptions {
  theme?: DagTheme;
  direction?: DagDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  nodeGap?: number;
  layerGap?: number;
  padding?: number;
  animate?: boolean;
  animationDuration?: number;
  showArrows?: boolean;
  flowEdges?: boolean;
  showControls?: boolean;
  showToolbar?: boolean;
  bordered?: boolean;
  editable?: boolean;
  showSettings?: boolean;
  showMinimap?: boolean;
  minimapPosition?: DagMinimapPosition;
  defaultCollapseDepth?: number;
}

export type ResolvedDagOptions = Required<DagOptions>;

export const DEFAULT_DAG_OPTIONS: ResolvedDagOptions = {
  theme: 'light',
  direction: 'TB',
  nodeWidth: 184,
  nodeHeight: 60,
  nodeGap: 28,
  layerGap: 90,
  padding: 40,
  animate: true,
  animationDuration: 450,
  showArrows: true,
  flowEdges: false,
  showControls: true,
  showToolbar: true,
  bordered: true,
  editable: true,
  showSettings: true,
  showMinimap: false,
  minimapPosition: 'bottom-left',
  defaultCollapseDepth: Infinity,
};

export interface LayoutNode {
  id: string;
  label: string;
  subtitle?: string;
  accent?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  order: number;
  data?: unknown;
  content?: DagContentBlock | DagContentBlock[];
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  path: string;
  labelX: number;
  labelY: number;
  data?: unknown;
}

export interface DagLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
}

export interface GraphPath {
  nodeIds: string[];
  edgeIds: string[];
}

export interface Adjacency {
  out: Map<string, string[]>;
  in: Map<string, string[]>;
  indegree: Map<string, number>;
}

export interface DagContentEvent {
  nodeId: string;
  action: 'form-submit' | 'link';
  payload: unknown;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LodLevel = 'far' | 'mid' | 'near';
