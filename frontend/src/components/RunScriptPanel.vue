<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-card flat class="run-script-panel">
    <v-card-title class="text-center">Run Script</v-card-title>
    <v-card-item>
      <v-textarea
        v-model="code"
        label="Python script"
        variant="outlined"
        rows="12"
        :disabled="isRunning"
        placeholder="print('hello')&#10;print('doc:', doc)"
        class="script-input"
      />
      <div class="d-flex align-center">
        <v-btn
          color="primary"
          :loading="isRunning"
          :disabled="!model || !code.trim() || isRunning"
          @click="runScript"
        >
          Run
        </v-btn>
        <v-spacer />
        <span v-if="currentRun" class="text-caption">
          <v-chip :color="statusColor" size="small">{{ currentRun.status }}</v-chip>
          <span v-if="currentRun.exitCode !== undefined" class="ml-2">
            exit {{ currentRun.exitCode }} · {{ formatDuration(currentRun.durationMs) }}
          </span>
        </span>
      </div>
      <v-divider class="my-4" v-if="currentRun" />
      <div v-if="currentRun?.stdout">
        <div class="text-caption font-weight-medium mb-1">stdout</div>
        <pre class="output">{{ currentRun.stdout }}</pre>
      </div>
      <div v-if="currentRun?.stderr">
        <div class="text-caption font-weight-medium text-error mb-1 mt-2">stderr</div>
        <pre class="output">{{ currentRun.stderr }}</pre>
      </div>
      <div v-if="currentRun?.error" class="text-error mt-2">
        {{ currentRun.error }}
      </div>
    </v-card-item>
  </v-card>
</template>

<script>
import { models } from '@feathersjs/vuex';

const { CodeRun } = models.api;

export default {
  name: 'RunScriptPanel',
  props: {
    model: {
      type: Object,
      required: false,
    },
  },
  data: () => ({
    code: '',
    runId: null,
    isCreating: false,
  }),
  computed: {
    // Reactively re-renders when feathers-vuex updates the store on `patched`
    currentRun() {
      return this.runId ? CodeRun.getFromStore(this.runId) : null;
    },
    isRunning() {
      if (this.isCreating) return true;
      if (!this.currentRun) return false;
      return ['queued', 'running'].includes(this.currentRun.status);
    },
    statusColor() {
      const map = { queued: 'grey', running: 'blue', success: 'success', error: 'error' };
      return map[this.currentRun?.status] || 'grey';
    },
  },
  methods: {
    formatDuration(ms) {
      if (ms == null) return '';
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
      const m = Math.floor(ms / 60_000);
      const s = Math.round((ms % 60_000) / 1000);
      return `${m}m ${s}s`;
    },
    async runScript() {
      if (!this.model || !this.code.trim()) return;
      this.isCreating = true;
      try {
        const run = await CodeRun.create({
          modelId: this.model._id,
          code: this.code,
        });
        this.runId = run._id;
      } catch (err) {
        console.error('failed to start run', err);
      } finally {
        this.isCreating = false;
      }
    },
  },
}
</script>

<style scoped>
.run-script-panel {
  text-align: left;
}
.output {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  max-height: 320px;
  overflow-y: auto;
  margin: 0;
}
.script-input :deep(textarea) {
  font-family: monospace;
  font-size: 13px;
}
</style>
