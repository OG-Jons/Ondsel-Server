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
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap } from '@codemirror/language';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { placeholders, insertPlaceholder, placeholderContext, placeholderCompletionSource } from '@/codemirror/placeholders';

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
  }),
  mounted() {
    this.editableCompartment = new Compartment();
    this.contextCompartment = new Compartment();
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
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
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
  border: 1px solid rgba(0, 0, 0, 0.38);
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  overflow: auto;
  resize: vertical;
}
.code-editor:focus-within {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}
.code-editor.is-disabled {
  background: #f5f5f5;
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
