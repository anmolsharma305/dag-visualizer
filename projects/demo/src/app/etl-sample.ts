import { DagEdge, DagNode } from 'ngx-dag-visualizer';

export const ETL_NODES: DagNode[] = [
  {
    id: 'extract',
    label: 'Extract',
    subtitle: 'Pull raw orders',
    accent: '#2563eb',
    data: { SOURCE: 'orders_db', ROWS: '1.2M', MODE: 'incremental' },
  },
  {
    id: 'clean',
    label: 'Clean',
    subtitle: 'Drop bad rows',
    accent: '#2563eb',
  },
  {
    id: 'validate',
    label: 'Validate',
    subtitle: 'Schema checks',
    accent: '#2563eb',
  },
  {
    id: 'transform',
    label: 'Transform',
    subtitle: 'Join + aggregations',
    accent: '#0d9488',
  },
  {
    id: 'load',
    label: 'Load',
    subtitle: 'Write to warehouse',
    accent: '#ea580c',
  },
  {
    id: 'notify',
    label: 'Notify',
    subtitle: 'Slack + email',
    accent: '#db2777',
  },
];

export const ETL_EDGES: DagEdge[] = [
  { source: 'extract', target: 'clean' },
  { source: 'extract', target: 'validate' },
  { source: 'clean', target: 'transform' },
  { source: 'validate', target: 'transform' },
  { source: 'transform', target: 'load' },
  { source: 'load', target: 'notify' },
];
