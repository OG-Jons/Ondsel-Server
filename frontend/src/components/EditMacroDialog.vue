<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-dialog
    v-model="dialog"
    width="auto"
    persistent
  >
    <v-card width="600">
      <v-card-title>
        <div class="text-center">{{ dialogTitle }}</div>
      </v-card-title>
      <v-progress-linear
        :active="isCreatePending || isPatchPending"
        indeterminate
        absolute
        bottom
      ></v-progress-linear>
      <v-form ref="macroForm" @submit.prevent="saveForm">
        <v-card-text>
          <v-text-field
            v-model.trim="formName"
            label="Name"
            :rules="rules"
            :disabled="isCreatePending || isPatchPending"
            autofocus
          ></v-text-field>
          <v-textarea
            v-model.trim="formDescription"
            label="Description (optional)"
            rows="2"
            :disabled="isCreatePending || isPatchPending"
          ></v-textarea>
          <div class="text-caption text-medium-emphasis mb-1 d-flex align-center ga-1">
            Python script
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
          <code-editor
            v-model="formCode"
            :disabled="isCreatePending || isPatchPending"
            placeholder="print('hello')&#10;print('doc:', doc)"
            min-height="18em"
            class="mb-3"
          />
          <div v-if="!editingId" class="text-caption text-medium-emphasis">
            <template v-if="currentOrganization?.type === 'Personal'">
              Will be saved to <span class="font-weight-medium">yourself</span>
            </template>
            <template v-else-if="currentOrganization?.type === 'Admin'">
              Will be saved as a <span class="font-weight-medium">global</span> macro — visible to everyone
            </template>
            <template v-else-if="currentOrganization">
              Will be saved to organization <span class="font-weight-medium">{{ currentOrganization.name }}</span>
            </template>
          </div>
        </v-card-text>
        <v-card-actions class="justify-center">
          <v-btn
            color="cancel"
            variant="elevated"
            @click="dialog = false"
          >Cancel</v-btn>
          <v-btn
            type="submit"
            color="primary"
            variant="elevated"
            :disabled="isCreatePending || isPatchPending"
          >{{ editingId ? 'Save changes' : 'Create' }}</v-btn>
        </v-card-actions>
      </v-form>
      <v-snackbar
        :timeout="2000"
        v-model="showSnacker"
      >
        {{ snackerMsg }}
      </v-snackbar>
    </v-card>
  </v-dialog>
</template>

<script>
import { models } from '@feathersjs/vuex';
import { mapGetters, mapState } from 'vuex';
import CodeEditor from '@/components/CodeEditor.vue';

const { Macro } = models.api;

export default {
  name: 'EditMacroDialog',
  components: { CodeEditor },
  data: () => ({
    dialog: false,
    editingId: null,
    editingIsGlobal: false,
    formName: '',
    formDescription: '',
    formCode: '',
    rules: [
      v => !!v || 'Name is required',
    ],
    snackerMsg: '',
    showSnacker: false,
  }),
  computed: {
    ...mapGetters('app', ['currentOrganization']),
    ...mapState('macros', ['isCreatePending', 'isPatchPending']),
    isGlobalContext() {
      return this.editingId
        ? this.editingIsGlobal
        : this.currentOrganization?.type === 'Admin';
    },
    dialogTitle() {
      const action = this.editingId ? 'Edit' : 'New';
      const subject = this.isGlobalContext ? 'Global Macro' : 'Macro';
      return `${action} ${subject}`;
    },
  },
  methods: {
    openCreate() {
      this.editingId = null;
      this.editingIsGlobal = false;
      this.formName = '';
      this.formDescription = '';
      this.formCode = '';
      this.dialog = true;
    },
    openEdit(m) {
      this.editingId = m._id;
      this.editingIsGlobal = !!m.isGlobal;
      this.formName = m.name;
      this.formDescription = m.description || '';
      this.formCode = m.code;
      this.dialog = true;
    },
    async saveForm() {
      const { valid } = await this.$refs.macroForm.validate();
      if (!valid) {
        return;
      }
      try {
        const data = {
          name: this.formName,
          description: this.formDescription || undefined,
          code: this.formCode,
        };
        if (this.editingId) {
          await Macro.patch(this.editingId, data);
        } else {
          await Macro.create({ ...data, organizationId: this.currentOrganization._id });
        }
        this.dialog = false;
      } catch (e) {
        console.log(e.message);
        this.snackerMsg = e.message;
        this.showSnacker = true;
      }
    },
  },
}
</script>

<style scoped>
</style>
