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
    <v-card width="34em" max-height="800">
      <v-card-title>
        <div class="text-center">Save as Macro</div>
      </v-card-title>
      <v-progress-linear
        :active="isCreatePending"
        indeterminate
        absolute
        bottom
      ></v-progress-linear>
      <v-form ref="saveMacroForm" @submit.prevent="saveMacro">
        <v-card-text>
          <v-text-field
            v-model.trim="name"
            label="Name"
            :rules="rules"
            :disabled="isCreatePending"
            autofocus
          ></v-text-field>
          <v-textarea
            v-model.trim="description"
            label="Description (optional)"
            rows="2"
            :disabled="isCreatePending"
          ></v-textarea>
          <div class="text-caption text-medium-emphasis">
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
            :disabled="isCreatePending"
          >Save</v-btn>
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
  name: 'SaveMacroDialog',
  props: {
    code: { type: String, required: true },
  },
  emits: ['saved'],
  data: () => ({
    dialog: false,
    name: '',
    description: '',
    rules: [
      v => !!v || 'Name is required',
    ],
    snackerMsg: '',
    showSnacker: false,
  }),
  computed: {
    ...mapGetters('app', ['currentOrganization']),
    ...mapState('macros', ['isCreatePending']),
  },
  methods: {
    openDialog() {
      this.name = '';
      this.description = '';
      this.dialog = true;
    },
    async saveMacro() {
      const { valid } = await this.$refs.saveMacroForm.validate();
      if (!valid) {
        return;
      }
      try {
        await Macro.create({
          name: this.name,
          description: this.description || undefined,
          code: this.code,
          organizationId: this.currentOrganization._id,
        });
        this.dialog = false;
        this.$emit('saved');
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
