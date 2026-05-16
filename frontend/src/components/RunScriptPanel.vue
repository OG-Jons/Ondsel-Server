<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-card flat class="run-script-panel">
    <v-card-title class="text-center">Run Script</v-card-title>
    <v-progress-linear
      :active="isCreatePending"
      indeterminate
      absolute
      bottom
    ></v-progress-linear>
    <v-card-text>
      <v-autocomplete
        v-model="loadedMacroId"
        :items="macros"
        item-title="name"
        item-value="_id"
        label="Load a saved macro (optional)"
        variant="outlined"
        density="comfortable"
        clearable
        hide-details
        class="mb-3"
        @update:model-value="onLoadMacro"
      />
      <div v-if="objectLabels.length || selectedObjects.length" class="mb-2" :class="{ 'opacity-50': isRunning }">
        <div class="text-caption text-medium-emphasis mb-1 d-flex align-center ga-1">
          Insert object reference:
          <v-tooltip location="right" max-width="320">
            <template #activator="{ props }">
              <v-icon v-bind="props" size="14" color="medium-emphasis">mdi-information-outline</v-icon>
            </template>
            <div>
              <div class="font-weight-medium mb-1">Object placeholders</div>
              <div><code>&lt;objLabel:NAME&gt;</code> — object by label</div>
              <div><code>&lt;selectedObject:N&gt;</code> — Nth selected object (1-based)</div>
              <div class="mt-1 text-caption">Placeholders are resolved to Python expressions before the script runs.</div>
            </div>
          </v-tooltip>
        </div>
        <div class="d-flex flex-wrap ga-1">
          <v-chip
            v-for="label of objectLabels"
            :key="label"
            size="small"
            variant="outlined"
            color="success"
            prepend-icon="mdi-cube-outline"
            :title="`Insert <objLabel:${label}>`"
            @click="insertObjLabel(label)"
          >{{ label }}</v-chip>
          <v-chip
            v-for="(label, i) of selectedObjects"
            :key="`sel-${i}`"
            size="small"
            variant="outlined"
            color="primary"
            prepend-icon="mdi-cursor-default-click-outline"
            :title="`Insert <selectedObject:${i + 1}> (${label})`"
            @click="insertSelectedObject(i + 1)"
          >{{ label }}</v-chip>
        </div>
      </div>
      <code-editor
        ref="editor"
        v-model="code"
        :disabled="isRunning"
        placeholder="print('hello')&#10;print('doc:', doc)"
        min-height="18em"
        class="mb-2"
        :placeholder-labels="objectLabels"
        :placeholder-viewer="viewer"
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
        <v-btn
          variant="outlined"
          class="ml-2"
          :disabled="!code.trim() || isRunning"
          @click="openSaveDialog"
        >
          Save as Macro
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
        <pre class="output bg-grey-darken-4 text-grey-lighten-3">{{ currentRun.stdout }}</pre>
      </div>
      <div v-if="currentRun?.stderr">
        <div class="text-caption font-weight-medium text-error mb-1 mt-2">stderr</div>
        <pre class="output bg-grey-darken-4 text-grey-lighten-3">{{ currentRun.stderr }}</pre>
      </div>
      <div v-if="currentRun?.error" class="text-error mt-2">
        {{ currentRun.error }}
      </div>
    </v-card-text>
    <v-snackbar
      :timeout="2000"
      v-model="showSnacker"
    >
      {{ snackerMsg }}
    </v-snackbar>
    <save-macro-dialog ref="saveMacroDialog" :code="code" />
  </v-card>
</template>

<script>
import { models } from '@feathersjs/vuex';
import { mapGetters, mapState } from 'vuex';
import SaveMacroDialog from '@/components/SaveMacroDialog.vue';
import CodeEditor from '@/components/CodeEditor.vue';
import { resolvePlaceholders } from '@/codemirror/resolve';

const { CodeRun, Macro } = models.api;

export default {
  name: 'RunScriptPanel',
  components: { SaveMacroDialog, CodeEditor },
  props: {
    model: {
      type: Object,
      required: false,
    },
    viewer: {
      type: Object,
      required: false,
    },
  },
  data: () => ({
    code: '',
    runId: null,
    loadedMacroId: null,
    snackerMsg: '',
    showSnacker: false,
  }),
  async created() {
    await Macro.find({ query: { $sort: { name: 1 } } });
  },
  computed: {
    ...mapGetters('app', ['currentOrganization']),
    ...mapState('code-runs', ['isCreatePending']),
    macros() {
      const all = Macro.findInStore({ query: { $sort: { name: 1 } } }).data || [];
      const orgId = this.currentOrganization?._id?.toString();
      if (!orgId) return all;
      return all.filter(m => m.isGlobal || m.organizationId?.toString() === orgId);
    },
    currentRun() {
      return this.runId ? CodeRun.getFromStore(this.runId) : null;
    },
    isRunning() {
      if (this.isCreatePending) return true;
      if (!this.currentRun) return false;
      return ['queued', 'running'].includes(this.currentRun.status);
    },
    statusColor() {
      const map = { queued: 'grey', running: 'blue', success: 'success', error: 'error' };
      return map[this.currentRun?.status] || 'grey';
    },
    objectLabels() {
      if (!this.viewer?.model) return [];
      return this.viewer.model.GetObjects().map(o => o.GetLabel());
    },
    selectedObjects() {
      return this.viewer?.selectedObjs?.map(o => o?.GetLabel?.()).filter(Boolean) ?? [];
    },
    selectionKey() {
      return this.selectedObjects.join(',');
    },
  },
  watch: {
    // viewer.selectedObjs is mutated in-place, so we derive a string key to
    // detect changes and push fresh context into the editor for chip re-render
    selectionKey() {
      this.$refs.editor?.reconfigureContext();
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
    onLoadMacro(macroId) {
      if (!macroId) return;
      const m = Macro.getFromStore(macroId);
      if (m) this.code = m.code;
    },
    async runScript() {
      if (!this.model || !this.code.trim()) return;
      try {
        const resolved = resolvePlaceholders(this.code, { viewer: this.viewer });
        const payload = {
          modelId: this.model._id,
          code: resolved,
        };
        if (this.loadedMacroId) payload.macroId = this.loadedMacroId;
        const run = await CodeRun.create(payload);
        this.runId = run._id;
      } catch (e) {
        console.log(e.message);
        this.snackerMsg = e.message;
        this.showSnacker = true;
      }
    },
    openSaveDialog() {
      this.$refs.saveMacroDialog.openDialog();
    },
    insertObjLabel(label) {
      if (this.isRunning) return;
      this.$refs.editor?.insertPlaceholder('objLabel', label);
    },
    insertSelectedObject(index) {
      if (this.isRunning) return;
      this.$refs.editor?.insertPlaceholder('selectedObject', index);
    },
  },
}
</script>

<style scoped>
.run-script-panel {
  text-align: left;
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
