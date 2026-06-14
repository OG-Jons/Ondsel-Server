<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <Main>
    <template #title>
      <v-icon icon="mdi-code-tags" />
      Macros
    </template>
    <template #actions>
      <v-btn
        color="success"
        variant="elevated"
        min-width="200"
        prepend-icon="mdi-plus"
        @click="openCreateDialog"
      >
        {{ isAdminOrg ? 'New Global Macro' : 'New Macro' }}
      </v-btn>
    </template>
    <template #content>
      <v-row class="mx-4 mt-4">
        <v-col>
          <v-alert type="info" variant="tonal" density="comfortable" icon="mdi-information-outline">
            Macros run from a model's <span class="font-weight-medium">Run Script</span> panel. Open any model and pick a macro from the <span class="font-weight-medium">Load a saved macro</span> dropdown.
          </v-alert>
        </v-col>
      </v-row>

      <v-row class="mx-4 mt-8" v-if="!visibleMacros.length" justify="center">
        <v-col cols="auto">
          <div class="text-medium-emphasis text-body-1">
            There are no macros here!
          </div>
        </v-col>
      </v-row>

      <template v-for="(section, i) of sections" :key="section.title">
        <v-row class="mx-4" :class="i === 0 ? 'mt-2' : 'mt-8'" dense>
          <v-col><div class="text-h6">{{ section.title }}</div></v-col>
        </v-row>
        <v-row class="mx-4">
          <v-col v-for="m of section.items" :key="m._id" cols="12" sm="6" md="4" lg="3">
            <v-card elevation="1" class="macro-card d-flex flex-column">
              <v-card-title class="pb-2 macro-title">
                <span :title="m.name">{{ m.name }}</span>
              </v-card-title>
              <v-card-text class="pt-0 description-row">
                <span v-if="m.description" class="text-body-2 text-medium-emphasis" :title="m.description">{{ m.description }}</span>
              </v-card-text>
              <v-card-text class="pt-0">
                <pre class="code-preview bg-grey-darken-4 text-grey-lighten-3">{{ m.code }}</pre>
              </v-card-text>
              <v-card-actions class="card-footer">
                <div class="text-caption text-medium-emphasis ml-2">
                  <div>Last Updated:</div>
                  <div>{{ dateFormat(m.updatedAt) }}</div>
                </div>
                <v-spacer />
                <v-btn
                  icon="mdi-pencil"
                  density="comfortable"
                  :disabled="!canManage(m)"
                  @click="openEditDialog(m)"
                ></v-btn>
                <v-btn
                  icon="mdi-delete-forever"
                  density="comfortable"
                  :disabled="!canManage(m)"
                  @click="openDeleteDialog(m)"
                ></v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <edit-macro-dialog ref="editMacroDialog" />
      <delete-generic-dialog
        ref="deleteMacroDialog"
        :title="deletingMacro ? `Macro &quot;${deletingMacro.name}&quot;` : 'Macro'"
        warning-message="Deleting this macro is not reversible."
        :error-message="deleteErrorMsg"
        @delete="performDelete"
      ></delete-generic-dialog>
    </template>
  </Main>
</template>

<script>
import { mapGetters } from 'vuex';
import { models } from '@feathersjs/vuex';
import Main from '@/layouts/default/Main.vue';
import EditMacroDialog from '@/components/EditMacroDialog.vue';
import DeleteGenericDialog from '@/components/DeleteGenericDialog.vue';

const { Macro } = models.api;

export default {
  name: 'Macros',
  components: { Main, EditMacroDialog, DeleteGenericDialog },
  data: () => ({
    deletingMacro: null,
    deleteErrorMsg: '',
  }),
  computed: {
    ...mapGetters('app', ['currentOrganization']),
    isAdminOrg() {
      return this.currentOrganization?.type === 'Admin';
    },
    macros() {
      return Macro.findInStore({ query: { $sort: { name: 1 } } }).data || [];
    },
    visibleMacros() {
      const orgId = this.currentOrganization._id.toString();
      return this.macros.filter(m => m.isGlobal || m.organizationId?.toString() === orgId);
    },
    orgMacros() {
      const orgId = this.currentOrganization._id.toString();
      return this.visibleMacros.filter(m => !m.isGlobal && m.organizationId?.toString() === orgId);
    },
    globalMacros() {
      return this.visibleMacros.filter(m => m.isGlobal);
    },
    sections() {
      return [
        { title: this.currentOrganization.name, items: this.orgMacros },
        { title: 'Global', items: this.globalMacros },
      ].filter(s => s.items.length);
    },
  },
  async created() {
    await Macro.find({ query: { $sort: { name: 1 } } });
  },
  methods: {
    canManage(m) {
      const orgId = this.currentOrganization._id.toString();
      return !!m.canManage && m.organizationId?.toString() === orgId;
    },
    dateFormat(number) {
      const date = new Date(number);
      return date.toDateString();
    },
    openCreateDialog() {
      this.$refs.editMacroDialog.openCreate();
    },
    openEditDialog(m) {
      this.$refs.editMacroDialog.openEdit(m);
    },
    openDeleteDialog(m) {
      this.deletingMacro = m;
      this.deleteErrorMsg = '';
      this.$refs.deleteMacroDialog.$data.showDialog = true;
    },
    async performDelete() {
      try {
        await Macro.remove(this.deletingMacro._id);
        this.$refs.deleteMacroDialog.$data.showDialog = false;
      } catch (e) {
        console.log(e.message);
        this.deleteErrorMsg = e.message;
      }
    },
  },
}
</script>

<style scoped>
.macro-card {
  height: 100%;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.macro-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}
.card-footer {
  background: #fafafa;
}
.macro-title :deep(span) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.description-row {
  height: 3em;
  overflow: hidden;
  margin-bottom: 12px;
}
.description-row span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.code-preview {
  font-family: monospace;
  font-size: 11px;
  padding: 8px;
  border-radius: 4px;
  white-space: pre;
  margin: 0;
  height: 8em;
  overflow: hidden;
}
</style>
