<!--
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-card class="ma-4">
    <v-card-title>OAuth Configuration</v-card-title>
    <v-card-subtitle>
      <v-btn density="default" icon="mdi-home" color="success"
        @click="$router.push({ name: 'XavierMenu', params: {} })"></v-btn> <b><i>Professor Xavier's School For
          The Hidden</i></b>
    </v-card-subtitle>
    <v-card-text>
      <v-form ref="form" v-model="valid">
        <v-row>
          <v-col cols="12">
            <v-card class="ma-2" elevation="1">
              <v-card-title>Google OAuth</v-card-title>
              <v-card-text>
                <p class="text-caption text-grey-darken-1 mb-4">
                  See the <a href="https://github.com/FreeCAD/Ondsel-Server/blob/main/docs/admin-panel.md#oauth-configuration" target="_blank" rel="noopener noreferrer">OAuth Configuration documentation</a> for setup instructions. Use the Redirect URI shown below when configuring your OAuth app.
                </p>

                <v-switch
                  v-model="googleConfig.enabled"
                  label="Enable Google OAuth"
                  color="primary"
                ></v-switch>

                <template v-if="!googleConfig.enabled">
                  <p class="text-caption text-grey-darken-1 mb-4">
                    Enable Google OAuth above to configure Client ID and Client Secret.
                  </p>
                </template>

                <v-text-field
                  v-model="googleConfig.clientId"
                  label="Client ID"
                  :rules="googleRules.clientId"
                  :disabled="isSaving || !googleConfig.enabled"
                  type="text"
                  hint="Google OAuth 2.0 Client ID from Google Cloud Console"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="googleConfig.clientSecret"
                  label="Client Secret"
                  :rules="googleRules.clientSecret"
                  :disabled="isSaving || !googleConfig.enabled"
                  type="password"
                  hint="Google OAuth 2.0 Client Secret (masked for security)"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  :model-value="googleRedirectUri"
                  label="Redirect URI"
                  readonly
                  hint="Use this redirect URI when configuring your Google OAuth app"
                  persistent-hint
                  class="mb-2"
                >
                  <template v-slot:append>
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      size="small"
                      @click="copyToClipboard(googleRedirectUri)"
                    ></v-btn>
                  </template>
                </v-text-field>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="success"
        variant="elevated"
        :disabled="!valid || isSaving"
        :loading="isSaving"
        @click="save"
      >
        Save
      </v-btn>
    </v-card-actions>

    <v-snackbar v-model="showSnackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-card>
</template>

<script>
import { mapActions, mapGetters, mapState } from "vuex";
import { models } from '@feathersjs/vuex';
import { SITE_CONFIG_ID } from '@/store/services/site-config';

export default {
  name: 'XavierOAuthConfig',
  data() {
    return {
      valid: false,
      isSaving: false,
      googleConfig: {
        enabled: false,
        clientId: '',
        clientSecret: '',
      },
      showSnackbar: false,
      snackbarMessage: '',
      snackbarColor: 'success',
      googleRules: {
        clientId: [
          v => {
            if (!this.googleConfig.enabled) return true;
            return !!v || 'Client ID is required when Google OAuth is enabled';
          }
        ],
        clientSecret: [
          v => {
            if (!this.googleConfig.enabled) return true;
            return !!v || 'Client Secret is required when Google OAuth is enabled';
          }
        ],
      },
    }
  },
  async created() {
    // Check if user is admin
    if (!(await this.isSiteAdministrator())) {
      console.log("alert-33238-oa");
      this.$router.push({name: 'LensHome', params: {}});
      return;
    }
  },
  computed: {
    ...mapState('auth', ['user']),
    ...mapGetters('app', ['siteConfig']),
    googleRedirectUri() {
      const baseUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, '') || window.location.origin;
      return `${baseUrl}/oauth/google/callback`;
    },
  },
  watch: {
    'siteConfig': {
      handler(newVal) {
        if (newVal && newVal.oauth?.providers?.google) {
          if (!this.googleConfig.clientId) {
            this.googleConfig = {
              enabled: newVal.oauth.providers.google.enabled || false,
              clientId: newVal.oauth.providers.google.clientId || '',
              clientSecret: newVal.oauth.providers.google.clientSecret || '',
            };
          }
        }
      },
      immediate: true
    },
    'googleConfig.enabled'() {
      // Trigger validation when enabled state changes
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.validate();
        }
      });
    },
  },
  methods: {
    ...mapActions('app', ['isSiteAdministrator']),
    async save() {
      if (!this.valid) return;

      this.isSaving = true;

      try {
        // Prepare OAuth config
        const oauthConfig = {
          providers: {
            google: {
              enabled: this.googleConfig.enabled,
              clientId: this.googleConfig.clientId.trim(),
              clientSecret: this.googleConfig.clientSecret.trim(),
              redirectUri: this.googleRedirectUri,
            },
          }
        };

        await models.api.SiteConfig.patch(SITE_CONFIG_ID, {
          oauth: oauthConfig,
        });

        this.showMessage('OAuth configuration saved successfully', 'success');
      } catch (error) {
        console.error('Failed to save OAuth config:', error);
        this.showMessage(error.message || 'Failed to save OAuth configuration', 'error');
      } finally {
        this.isSaving = false;
      }
    },
    copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        this.showMessage('Redirect URI copied to clipboard', 'success');
      }).catch(err => {
        console.error('Failed to copy:', err);
        this.showMessage('Failed to copy to clipboard', 'error');
      });
    },
    showMessage(message, color) {
      this.snackbarMessage = message;
      this.snackbarColor = color;
      this.showSnackbar = true;
    }
  }
}
</script>

<style scoped>
</style>
