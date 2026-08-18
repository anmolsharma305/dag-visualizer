import { Component, viewChild } from '@angular/core';
import { DagOptions, DagViewerComponent } from 'ngx-dag-visualizer';
import { ETL_EDGES, ETL_NODES } from './etl-sample';

@Component({
  selector: 'app-root',
  imports: [DagViewerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly dag = viewChild(DagViewerComponent);

  readonly nodes = ETL_NODES;
  readonly edges = ETL_EDGES;
  readonly options: DagOptions = {
    direction: 'TB',
    showMinimap: true,
    flowEdges: true,
    theme: 'light',
    defaultCollapseDepth: Infinity,
  };

  play(): void {
    this.dag()?.play();
  }

  pause(): void {
    this.dag()?.pause();
  }

  reset(): void {
    this.dag()?.resetRun();
  }
}
