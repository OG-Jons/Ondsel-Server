<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div ref="host" class="code-editor" :class="{ 'is-disabled': disabled }"></div>
</template>

<script>
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, placeholder } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python, pythonLanguage } from '@codemirror/lang-python';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle, HighlightStyle, foldGutter, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { tags as t } from '@lezer/highlight';
import { placeholders, insertPlaceholder, placeholderContext, placeholderCompletionSource } from '@/codemirror/placeholders';

// CodeMirror chrome for dark mode. Background is left transparent so the
// themed wrapper (.code-editor) background shows through in both themes.
const cmDarkTheme = EditorView.theme({
  '&': {
    color: '#e0e0e0',
    backgroundColor: 'transparent',
    // Dark overrides for the placeholder chips (see placeholders.js): a dark
    // tint of each hue with a light same-hue text so they read on dark bg.
    '--cm-chip-green-bg': 'rgba(76, 175, 80, 0.18)',
    '--cm-chip-green-fg': '#a5d6a7',
    '--cm-chip-green-border': 'rgba(76, 175, 80, 0.5)',
    '--cm-chip-blue-bg': 'rgba(33, 150, 243, 0.18)',
    '--cm-chip-blue-fg': '#90caf9',
    '--cm-chip-blue-border': 'rgba(33, 150, 243, 0.5)',
    '--cm-chip-red-bg': 'rgba(244, 67, 54, 0.18)',
    '--cm-chip-red-fg': '#ef9a9a',
    '--cm-chip-red-border': 'rgba(244, 67, 54, 0.5)',
  },
  '.cm-content': { caretColor: '#5C9CE6' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#5C9CE6' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#264f78',
  },
  '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  '.cm-gutters': { backgroundColor: 'transparent', color: '#7a7a7a', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  '.cm-foldPlaceholder': { backgroundColor: 'transparent', border: 'none', color: '#888' },
  '.cm-placeholder': { color: '#6b6b6b' },
  '.cm-matchingBracket, .cm-nonmatchingBracket': { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
}, { dark: true });

// Syntax colours tuned for a dark background (VS Code "Dark+" palette).
const darkHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#c586c0' },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: '#9cdcfe' },
  { tag: [t.function(t.variableName), t.labelName], color: '#dcdcaa' },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#4fc1ff' },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: '#4ec9b0' },
  { tag: [t.operator, t.operatorKeyword], color: '#d4d4d4' },
  { tag: [t.url, t.escape, t.regexp, t.link], color: '#d16969' },
  { tag: [t.meta, t.comment], color: '#6a9955', fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: [t.string, t.inserted], color: '#ce9178' },
  { tag: t.invalid, color: '#f44747' },
], { themeType: 'dark' });

const lightThemeExtension = [syntaxHighlighting(defaultHighlightStyle, { fallback: true })];
const darkThemeExtension = [cmDarkTheme, syntaxHighlighting(darkHighlightStyle)];

export default {
  name: 'CodeEditor',
  props: {
    modelValue: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    minHeight: { type: String, default: '12em' },
    placeholderLabels: { type: Array, default: null },
    placeholderViewer: { type: Object, default: null },
  },
  emits: ['update:modelValue'],
  data: () => ({
    view: null,
    editableCompartment: null,
    contextCompartment: null,
    themeCompartment: null,
  }),
  computed: {
    isDark() {
      return this.$vuetify.theme.global.name === 'dark';
    },
  },
  mounted() {
    this.editableCompartment = new Compartment();
    this.contextCompartment = new Compartment();
    this.themeCompartment = new Compartment();
    const state = EditorState.create({
      doc: this.modelValue,
      extensions: [
        this.contextCompartment.of(placeholderContext.of({
          labels: this.placeholderLabels,
          viewer: this.placeholderViewer,
        })),
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        indentOnInput(),
        this.themeCompartment.of(this.isDark ? darkThemeExtension : lightThemeExtension),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          {
            // Tab on empty editor inserts the placeholder text as real content
            key: 'Tab',
            run: (view) => {
              if (view.state.doc.length > 0 || !this.placeholder) return false;
              view.dispatch({
                changes: { from: 0, to: 0, insert: this.placeholder },
                selection: { anchor: this.placeholder.length },
              });
              return true;
            },
          },
          indentWithTab,
        ]),
        python(),
        pythonLanguage.data.of({ autocomplete: placeholderCompletionSource }),
        placeholders(),
        placeholder(this.placeholder),
        EditorView.lineWrapping,
        this.editableCompartment.of(EditorView.editable.of(!this.disabled)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.$emit('update:modelValue', update.state.doc.toString());
          }
        }),
      ],
    });
    this.view = new EditorView({ state, parent: this.$refs.host });
  },
  beforeUnmount() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  },
  methods: {
    insertPlaceholder(kind, value) {
      if (!this.view) return;
      insertPlaceholder(this.view, kind, value);
    },
    reconfigureContext() {
      if (!this.view) return;
      this.view.dispatch({
        effects: this.contextCompartment.reconfigure(placeholderContext.of({
          labels: this.placeholderLabels,
          viewer: this.placeholderViewer,
        })),
      });
    },
  },
  watch: {
    modelValue(newVal) {
      if (!this.view) return;
      const current = this.view.state.doc.toString();
      if (newVal !== current) {
        this.view.dispatch({
          changes: { from: 0, to: current.length, insert: newVal ?? '' },
        });
      }
    },
    disabled(newVal) {
      if (!this.view) return;
      this.view.dispatch({
        effects: this.editableCompartment.reconfigure(EditorView.editable.of(!newVal)),
      });
    },
    isDark(dark) {
      if (!this.view) return;
      this.view.dispatch({
        effects: this.themeCompartment.reconfigure(dark ? darkThemeExtension : lightThemeExtension),
      });
    },
    placeholderLabels() {
      this.reconfigureContext();
    },
    placeholderViewer() {
      this.reconfigureContext();
    },
  },
}
</script>

<style scoped>
.code-editor {
  border: 1px solid rgba(var(--v-border-color, 0, 0, 0), 0.38);
  border-radius: 4px;
  font-size: 13px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  overflow: auto;
  resize: vertical;
}
.code-editor:focus-within {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}
.code-editor.is-disabled {
  background: rgba(var(--v-theme-on-surface), 0.04);
  opacity: 0.7;
}
.code-editor :deep(.cm-editor) {
  outline: none;
}
.code-editor :deep(.cm-scroller) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  min-height: v-bind(minHeight);
}
.code-editor :deep(.cm-content) {
  padding: 8px 0;
}
.code-editor :deep(.cm-placeholder) {
  position: absolute;
  pointer-events: none;
}
</style>
