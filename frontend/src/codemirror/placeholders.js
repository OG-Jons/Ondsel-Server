// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { Facet, RangeSetBuilder } from '@codemirror/state';
import { snippetCompletion } from '@codemirror/autocomplete';

const PLACEHOLDER_RE = /<(objLabel|selectedObject):([^<>\n]+)>/g;

// Context provided by the host component. When unset (e.g. EditMacroDialog),
// chips render without stale validation; tooltips show generic resolution text.
export const placeholderContext = Facet.define({
  combine: values => values[0] ?? { labels: null, viewer: null },
});

// Converts a JS string to a Python single-quoted string literal with escaping
const pyStr = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const ordinal = n => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;

function resolveDisplayLabel(kind, value, { viewer }) {
  if (kind === 'selectedObject') {
    const idx = parseInt(value, 10) - 1;
    return viewer?.selectedObjs?.[idx]?.GetLabel?.() || `#${value}`;
  }
  return value;
}

function isStale(kind, value, { labels, viewer }) {
  if (kind === 'objLabel') {
    if (!labels) return false;
    return !labels.includes(value);
  }
  if (kind === 'selectedObject') {
    if (!viewer) return false;
    const idx = parseInt(value, 10);
    if (Number.isNaN(idx) || idx < 1) return true;
    return !viewer.selectedObjs?.[idx - 1];
  }
  return false;
}

function buildTitle(kind, value, { viewer }, stale) {
  if (kind === 'objLabel') {
    if (stale) return `No object labelled "${value}" in the current model — resolves to doc.getObjectsByLabel(${pyStr(value)})[0]`;
    return `Resolves to: doc.getObjectsByLabel(${pyStr(value)})[0]`;
  }
  if (kind === 'selectedObject') {
    const idx = parseInt(value, 10);
    if (Number.isNaN(idx) || idx < 1) return `Index must be a positive integer (got "${value}")`;
    if (!viewer) return `Resolves to: the ${ordinal(idx)} selected object at run time`;
    if (stale) return `Selection has no object at index ${value} — resolves to None`;
    const label = viewer.selectedObjs?.[idx - 1]?.GetLabel?.();
    return label
      ? `Resolves to: doc.getObjectsByLabel(${pyStr(label)})[0]`
      : `Resolves to: the ${ordinal(idx)} selected object at run time`;
  }
  return '';
}

class PlaceholderWidget extends WidgetType {
  constructor(kind, value, ctx) {
    super();
    this.kind = kind;
    this.value = value;
    this.stale = isStale(kind, value, ctx);
    this.title = buildTitle(kind, value, ctx, this.stale);
    this.displayLabel = resolveDisplayLabel(kind, value, ctx);
  }

  eq(other) {
    return other.kind === this.kind && other.value === this.value
      && other.stale === this.stale && other.title === this.title
      && other.displayLabel === this.displayLabel;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = `cm-placeholder-chip cm-placeholder-${this.kind}`;
    if (this.stale) span.classList.add('cm-placeholder-stale');
    if (this.title) span.title = this.title;
    const icon = document.createElement('span');
    icon.className = 'cm-placeholder-icon';
    icon.textContent = this.kind === 'objLabel' ? '◆' : '◯';
    const label = document.createElement('span');
    label.textContent = this.displayLabel;
    span.appendChild(icon);
    span.appendChild(label);
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

function cursorOverlaps(view, start, end) {
  for (const range of view.state.selection.ranges) {
    if (range.from <= end && range.to >= start) return true;
  }
  return false;
}

function buildResult(view) {
  const ctx = view.state.facet(placeholderContext);
  const allBuilder = new RangeSetBuilder();
  const atomicBuilder = new RangeSetBuilder();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    PLACEHOLDER_RE.lastIndex = 0;
    let match;
    while ((match = PLACEHOLDER_RE.exec(text)) !== null) {
      const start = from + match.index;
      const end = start + match[0].length;
      const kind = match[1];
      const value = match[2].trim();
      if (cursorOverlaps(view, start, end)) {
        allBuilder.add(start, end, Decoration.mark({ class: `cm-placeholder-editing cm-placeholder-${kind}` }));
      } else {
        const widget = new PlaceholderWidget(kind, value, ctx);
        const dec = Decoration.replace({ widget, inclusive: false });
        allBuilder.add(start, end, dec);
        atomicBuilder.add(start, end, dec);
      }
    }
  }
  return { decorations: allBuilder.finish(), atomic: atomicBuilder.finish() };
}

const placeholderPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      const r = buildResult(view);
      this.decorations = r.decorations;
      this.atomic = r.atomic;
    }
    update(update) {
      if (update.docChanged || update.viewportChanged || update.selectionSet || update.focusChanged
        || update.startState.facet(placeholderContext) !== update.state.facet(placeholderContext)) {
        const r = buildResult(update.view);
        this.decorations = r.decorations;
        this.atomic = r.atomic;
      }
    }
  },
  {
    decorations: v => v.decorations,
    provide: plugin => EditorView.atomicRanges.of(view => view.plugin(plugin)?.atomic || Decoration.none),
  },
);

const placeholderTheme = EditorView.theme({
  '.cm-placeholder-chip': {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0 6px',
    borderRadius: '12px',
    fontSize: '0.85em',
    border: '1px solid',
    margin: '0 1px',
    cursor: 'default',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  '.cm-placeholder-icon': {
    marginRight: '4px',
    fontSize: '0.85em',
  },
  '.cm-placeholder-objLabel': {
    background: '#e8f5e9',
    color: '#1b5e20',
    borderColor: '#a5d6a7',
  },
  '.cm-placeholder-selectedObject': {
    background: '#e3f2fd',
    color: '#0d47a1',
    borderColor: '#90caf9',
  },
  '.cm-placeholder-chip.cm-placeholder-stale': {
    background: '#ffebee',
    color: '#b71c1c',
    borderColor: '#ef9a9a',
    textDecoration: 'line-through',
  },
  '.cm-placeholder-editing': {
    borderRadius: '3px',
    padding: '0 1px',
  },
  '.cm-placeholder-editing.cm-placeholder-objLabel': {
    background: '#e8f5e9',
    color: '#1b5e20',
    outline: '1px solid #a5d6a7',
  },
  '.cm-placeholder-editing.cm-placeholder-selectedObject': {
    background: '#e3f2fd',
    color: '#0d47a1',
    outline: '1px solid #90caf9',
  },
});

function makePlaceholderApply(text) {
  return (view, _completion, from, to) => {
    const charAfter = to < view.state.doc.length
      ? view.state.doc.sliceString(to, to + 1) : '';
    const replaceTo = charAfter === '>' ? to + 1 : to;
    view.dispatch({
      changes: { from, to: replaceTo, insert: text },
      selection: { anchor: from + text.length },
    });
  };
}

export function placeholderCompletionSource(ctx) {
  const before = ctx.matchBefore(/<[^<>\n]*$/);
  if (!before) return null;

  const { labels, viewer } = ctx.state.facet(placeholderContext);
  const options = [];

  if (labels?.length) {
    for (const label of labels) {
      const text = `<objLabel:${label}>`;
      options.push({ label: text, type: 'variable', detail: 'object label', boost: 1, apply: makePlaceholderApply(text) });
    }
  } else {
    options.push(snippetCompletion('<objLabel:#{label}>', {
      label: '<objLabel:…>',
      type: 'variable',
      detail: 'object label',
      boost: 1,
    }));
  }

  if (viewer?.selectedObjs?.length) {
    for (let i = 0; i < viewer.selectedObjs.length; i++) {
      const objLabel = viewer.selectedObjs[i]?.GetLabel?.();
      const text = `<selectedObject:${i + 1}>`;
      options.push({ label: text, type: 'variable', detail: objLabel || `index ${i + 1}`, apply: makePlaceholderApply(text) });
    }
  } else {
    options.push(snippetCompletion('<selectedObject:#{index}>', {
      label: '<selectedObject:…>',
      type: 'variable',
      detail: 'selected object by index',
    }));
  }

  return {
    from: before.from,
    options,
    validFor: /<[^<>\n]*$/,
  };
}

export const placeholders = () => [placeholderPlugin, placeholderTheme];

export const insertPlaceholder = (view, kind, value) => {
  const text = `<${kind}:${value}>`;
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  });
  view.focus();
};
