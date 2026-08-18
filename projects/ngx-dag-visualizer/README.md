# ngx-dag-visualizer

A dependency-free Directed Acyclic Graph visualizer for **Angular 21+**.

`<ngx-dag>` takes nodes and edges and draws an interactive SVG graph: layered layout, curved edges, zoom/pan, collapsible subtrees, rich node cards, search, path tracing, undo/redo, and a pipeline run simulator. There is no D3, dagre, Cytoscape, or ELK — layout, viewport math, and animation are implemented in this package.

## Install (workspace)

This repo is an Angular workspace. The library lives in `projects/ngx-dag-visualizer`. After publishing:

```bash
npm install ngx-dag-visualizer
```

Peer dependencies: `@angular/core` and `@angular/common` **>= 21.0.0**.

## Minimal usage

```ts
import { Component } from '@angular/core';
import { DagViewerComponent, DagNode, DagEdge } from 'ngx-dag-visualizer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DagViewerComponent],
  template: `
    <div style="height: 100vh">
      <ngx-dag [nodes]="nodes" [edges]="edges" [options]="{ direction: 'TB' }" />
    </div>
  `,
})
export class App {
  nodes: DagNode[] = [
    { id: 'extract', label: 'Extract', subtitle: 'read source' },
    { id: 'load', label: 'Load', subtitle: 'write target' },
  ];
  edges: DagEdge[] = [{ source: 'extract', target: 'load' }];
}
```

Give the host a height. The visualizer fills its container.

## Public API

- **Inputs:** `nodes`, `edges`, `options`, `graphTitle`, `runState`, `autoRun`, `stepDuration`, `detailTemplate`, `showPropertyPanel`
- **Outputs:** `nodeClick`, `nodeExpand`, `edgeClick`, `graphChange`, `statusChange`, `runComplete`, `contentEvent`
- **Methods:** `zoomIn`, `zoomOut`, `fitToContent`, `center`, `tracePath`, `play`, `pause`, `resetRun`, `toggleChildren`, `undo`, `redo`, `toJSON`, `fromJSON`, …

Template ref: `#dag="ngxDag"`.

## Develop

```bash
npm start          # demo app
npm run test       # library unit tests
npm run build:lib  # production library build
```
