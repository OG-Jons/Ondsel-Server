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
          <v-textarea
            v-model="formCode"
            label="Python script"
            rows="12"
            placeholder="print('hello')"
            class="code-input"
            :disabled="isCreatePending || isPatchPending"
          ></v-textarea>
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

const { Macro } = models.api;

export default {
  name: 'EditMacroDialog',
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
.code-input :deep(textarea) {
  font-family: monospace;
  font-size: 13px;
}
</style>
