<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div
    class="history-panel flex-shrink-0"
    :style="{ height: height + 'px' }"
  >
    <div class="history-resize-handle" @mousedown="startResize"></div>
    <div class="history-header">
      <span class="text-caption font-weight-medium">Run History</span>
      <v-progress-circular v-if="loading" size="14" width="2" indeterminate class="ml-2" />
      <v-spacer />
      <v-btn icon size="x-small" variant="text" :title="maximized ? 'Restore' : 'Maximize'" @click="toggleMaximize">
        <v-icon size="16">{{ maximized ? 'mdi-arrow-collapse-down' : 'mdi-arrow-expand-up' }}</v-icon>
      </v-btn>
      <v-btn icon size="x-small" variant="text" title="Close history" @click="$emit('close')">
        <v-icon size="16">mdi-close</v-icon>
      </v-btn>
    </div>
    <div class="history-list">
      <div v-if="!loading && !runs.length" class="text-caption text-medium-emphasis pa-3">
        No runs yet for this model.
      </div>
      <div
        v-for="run in runs"
        :key="run._id"
        class="history-row"
        :class="{ 'history-row--active': expandedRunId === run._id }"
      >
        <div class="history-row-summary" @click="toggleExpand(run._id)">
          <v-icon :color="run.status === 'success' ? 'success' : run.status === 'error' ? 'error' : 'grey'" size="14">
            {{ run.status === 'success' ? 'mdi-check-circle' : run.status === 'error' ? 'mdi-close-circle' : 'mdi-clock-outline' }}
          </v-icon>
          <template v-if="run.macroName">
            <v-icon size="14" class="ml-2 mr-1" color="medium-emphasis">mdi-script-text-outline</v-icon>
            <span class="history-code text-caption ml-0">{{ run.macroName }}</span>
          </template>
          <span v-else class="history-code text-caption text-mono ml-2">{{ firstLine(run.code) }}</span>
          <span class="history-time text-caption text-medium-emphasis ml-auto mr-2">{{ timeAgo(run.createdAt) }}</span>
          <v-btn icon size="x-small" variant="text" title="Load script" @click.stop="$emit('load', run)">
            <v-icon size="14">mdi-arrow-down-circle-outline</v-icon>
          </v-btn>
          <v-btn icon size="x-small" variant="text" title="Re-run" :disabled="isRunning" @click.stop="$emit('rerun', run)">
            <v-icon size="14">mdi-refresh</v-icon>
          </v-btn>
        </div>
        <div v-if="expandedRunId === run._id" class="history-row-detail">
          <v-tabs v-model="expandedTab[run._id]" density="compact" class="mb-2">
            <v-tab value="output" class="text-caption">Output</v-tab>
            <v-tab value="code" class="text-caption">Code</v-tab>
          </v-tabs>
          <template v-if="(expandedTab[run._id] || 'output') === 'output'">
            <pre v-if="run.stdout" class="output bg-grey-darken-4 text-grey-lighten-3 mb-1">{{ run.stdout }}</pre>
            <pre v-if="run.stderr" class="output bg-grey-darken-4 text-error mb-1">{{ run.stderr }}</pre>
            <div v-if="!run.stdout && !run.stderr" class="text-caption text-medium-emphasis">(no output)</div>
          </template>
          <template v-else>
            <pre class="output bg-grey-darken-4 text-grey-lighten-3">{{ run.code }}</pre>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { models } from '@feathersjs/vuex';

const { CodeRun } = models.api;

const HISTORY_QUERY = { $sort: { createdAt: -1 }, $limit: 20 };

export default {
  name: 'RunHistoryPanel',
  props: {
    model: {
      type: Object,
      required: false,
    },
    sharedModelId: {
      type: String,
      required: false,
      default: null,
    },
    isRunning: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'load', 'rerun'],
  data: () => ({
    height: 200,
    maximized: false,
    loading: false,
    expandedRunId: null,
    expandedTab: {},
  }),
  computed: {
    historyQuery() {
      if (this.sharedModelId) {
        return { sharedModelId: this.sharedModelId, ...HISTORY_QUERY };
      }
      const modelId = this.model?._id;
      return modelId ? { modelId, ...HISTORY_QUERY } : null;
    },
    runs() {
      if (!this.historyQuery) return [];
      return CodeRun.findInStore({ query: this.historyQuery }).data || [];
    },
  },
  async created() {
    if (!this.historyQuery) return;
    this.loading = true;
    await CodeRun.find({ query: this.historyQuery });
    this.loading = false;
  },
  mounted() {
    this.setInitialHeight();
    window.addEventListener('resize', this.recalculateHeight);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.recalculateHeight);
  },
  methods: {
    clampHeight(height, panelHeight = this.$el?.parentElement?.clientHeight || 0) {
      if (!panelHeight) return Math.max(140, Math.round(height));
      return Math.max(140, Math.min(panelHeight, Math.round(height)));
    },
    getTargetHeight(anchor) {
      const panel = this.$el?.parentElement;
      const panelHeight = panel?.clientHeight || 0;
      const scrollPanel = panel?.querySelector('.panel-scroll');
      const fallback = anchor === 'run' ? panelHeight * 0.6 : panelHeight;
      if (!panelHeight || !scrollPanel) return this.clampHeight(fallback, panelHeight);

      const targetEl = anchor === 'macro'
        ? scrollPanel.querySelector('.macro-load-field')
        : panel.querySelector('.run-actions-row');
      if (!targetEl) return this.clampHeight(fallback, panelHeight);

      let offsetTop = 0;
      let node = targetEl;
      while (node && node !== scrollPanel) {
        offsetTop += node.offsetTop || 0;
        node = node.offsetParent;
      }
      const targetBottomInScroll = offsetTop + targetEl.offsetHeight;
      return this.clampHeight(panelHeight - targetBottomInScroll - 8, panelHeight);
    },
    setInitialHeight() {
      this.height = this.getTargetHeight('run');
      this.maximized = false;
    },
    recalculateHeight() {
      if (this.maximized) {
        this.height = this.getTargetHeight('macro');
        return;
      }
      this.height = this.clampHeight(this.height);
    },
    timeAgo(ts) {
      if (!ts) return '';
      const diff = Date.now() - ts;
      if (diff < 60_000) return 'just now';
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
      if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
      return `${Math.floor(diff / 86_400_000)}d ago`;
    },
    firstLine(code) {
      if (!code) return '';
      const line = code.split('\n')[0].trim();
      return line.length > 60 ? line.slice(0, 60) + '…' : line;
    },
    toggleExpand(runId) {
      this.expandedRunId = this.expandedRunId === runId ? null : runId;
    },
    toggleMaximize() {
      if (this.maximized) {
        this.height = this.getTargetHeight('run');
        this.maximized = false;
        return;
      }
      this.height = this.getTargetHeight('macro');
      this.maximized = true;
    },
    startResize(e) {
      const startY = e.clientY;
      const startHeight = this.height;
      this.maximized = false;
      document.body.style.userSelect = 'none';
      const onMove = (ev) => {
        const delta = startY - ev.clientY;
        this.height = this.clampHeight(startHeight + delta);
      };
      const onUp = () => {
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
  },
}
</script>

<style scoped>
.history-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.history-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  z-index: 1;
}
.history-resize-handle:hover {
  background: rgba(var(--v-theme-primary), 0.15);
}
.history-header {
  padding: 6px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
.history-list {
  overflow-y: auto;
  flex: 1;
}
.history-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.history-row-summary {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  cursor: pointer;
  user-select: none;
}
.history-row-summary:hover {
  background: rgba(0, 0, 0, 0.03);
}
.history-row--active .history-row-summary {
  background: rgba(0, 0, 0, 0.04);
}
.history-code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}
.history-row-detail {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.02);
}
.output {
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  max-height: 320px;
  overflow-y: auto;
  margin: 0;
}
</style>
