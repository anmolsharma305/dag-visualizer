import { Component, input } from '@angular/core';

export type DagIconName =
  | 'undo'
  | 'redo'
  | 'minus'
  | 'plus'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'center'
  | 'fullscreen'
  | 'trace'
  | 'download'
  | 'upload'
  | 'settings'
  | 'close'
  | 'search'
  | 'expand'
  | 'check'
  | 'clock'
  | 'alert'
  | 'case'
  | 'word'
  | 'play'
  | 'pause'
  | 'reset';

@Component({
  selector: 'ngx-dag-icon',
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @switch (name()) {
        @case ('undo') {
          <path d="M3 7v6h6" />
          <path d="M3 13a9 9 0 1 0 3-7.7L3 13" />
        }
        @case ('redo') {
          <path d="M21 7v6h-6" />
          <path d="M21 13a9 9 0 1 1-3-7.7L21 13" />
        }
        @case ('minus') {
          <path d="M5 12h14" />
        }
        @case ('plus') {
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        }
        @case ('zoom-out') {
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
          <path d="M8 11h6" />
        }
        @case ('zoom-in') {
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        }
        @case ('fit') {
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M16 3h3a2 2 0 0 1 2 2v3" />
          <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        }
        @case ('center') {
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        }
        @case ('fullscreen') {
          <path d="M8 3H3v5" />
          <path d="M16 3h5v5" />
          <path d="M8 21H3v-5" />
          <path d="M16 21h5v-5" />
        }
        @case ('trace') {
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M8.5 7.5 15 15" />
          <path d="M15 9h3v3" />
        }
        @case ('download') {
          <path d="M12 3v12" />
          <path d="m7 11 5 5 5-5" />
          <path d="M5 21h14" />
        }
        @case ('upload') {
          <path d="M12 21V9" />
          <path d="m7 13 5-5 5 5" />
          <path d="M5 3h14" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.9 4.9 1.4 1.4" />
          <path d="m17.7 17.7 1.4 1.4" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m4.9 19.1 1.4-1.4" />
          <path d="m17.7 6.3 1.4-1.4" />
        }
        @case ('close') {
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        }
        @case ('expand') {
          <path d="M9 3H5a2 2 0 0 0-2 2v4" />
          <path d="M15 3h4a2 2 0 0 1 2 2v4" />
          <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
          <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
        }
        @case ('check') {
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        }
        @case ('case') {
          <path d="M3 19h6" />
          <path d="m6 19 3-14h2l3 14" />
          <path d="M8 13h6" />
          <path d="M16 11h5v8h-5z" />
        }
        @case ('word') {
          <path d="M4 19V5" />
          <path d="M4 19h4" />
          <path d="M4 5h4" />
          <path d="M14 19V9l4 10 4-10v10" />
        }
        @case ('play') {
          <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
        }
        @case ('pause') {
          <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
          <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
        }
        @case ('reset') {
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
    svg {
      width: 1em;
      height: 1em;
    }
  `,
})
export class DagIconComponent {
  readonly name = input.required<DagIconName>();
}
