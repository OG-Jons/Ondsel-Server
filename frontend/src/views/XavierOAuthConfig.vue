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
                  See the <a href="https://github.com/FreeCAD/Ondsel-Server/blob/main/docs/admin-panel.md#google-oauth" target="_blank" rel="noopener noreferrer">Google OAuth setup instructions</a> in the OAuth Configuration documentation. Use the Redirect URI shown below when configuring your Google OAuth app.
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
          <v-col cols="12">
            <v-card class="ma-2" elevation="1">
              <v-card-title>GitHub OAuth</v-card-title>
              <v-card-text>
                <p class="text-caption text-grey-darken-1 mb-4">
                  See the <a href="https://github.com/FreeCAD/Ondsel-Server/blob/main/docs/admin-panel.md#github-oauth" target="_blank" rel="noopener noreferrer">GitHub OAuth setup instructions</a> in the OAuth Configuration documentation. Use the Redirect URI shown below when configuring your GitHub OAuth app.
                </p>

                <v-switch
                  v-model="githubConfig.enabled"
                  label="Enable GitHub OAuth"
                  color="primary"
                ></v-switch>

                <template v-if="!githubConfig.enabled">
                  <p class="text-caption text-grey-darken-1 mb-4">
                    Enable GitHub OAuth above to configure Client ID and Client Secret.
                  </p>
                </template>

                <v-text-field
                  v-model="githubConfig.clientId"
                  label="Client ID"
                  :rules="githubRules.clientId"
                  :disabled="isSaving || !githubConfig.enabled"
                  type="text"
                  hint="GitHub OAuth App Client ID"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="githubConfig.clientSecret"
                  label="Client Secret"
                  :rules="githubRules.clientSecret"
                  :disabled="isSaving || !githubConfig.enabled"
                  type="password"
                  hint="GitHub OAuth App Client Secret (masked for security)"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  :model-value="githubRedirectUri"
                  label="Redirect URI"
                  readonly
                  hint="Use this redirect URI when configuring your GitHub OAuth app"
                  persistent-hint
                  class="mb-2"
                >
                  <template v-slot:append>
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      size="small"
                      @click="copyToClipboard(githubRedirectUri)"
                    ></v-btn>
                  </template>
                </v-text-field>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12">
            <v-card class="ma-2" elevation="1">
              <v-card-title>OpenID Connect (OIDC)</v-card-title>
              <v-card-text>
                <p class="text-caption text-grey-darken-1 mb-4">
                  See the
                  <a
                    href="https://github.com/FreeCAD/Ondsel-Server/blob/main/docs/admin-panel.md#openid-connect-oidc"
                    target="_blank"
                    rel="noopener noreferrer"
                  >OpenID Connect (OIDC) setup instructions</a>
                  in the OAuth Configuration documentation. Use the Redirect URI shown below when configuring your OIDC client.
                </p>

                <v-switch
                  v-model="oidcConfig.enabled"
                  label="Enable OIDC sign-in"
                  color="primary"
                ></v-switch>

                <template v-if="!oidcConfig.enabled">
                  <p class="text-caption text-grey-darken-1 mb-4">
                    Enable OIDC sign-in above to configure Issuer URL, Client ID, Client Secret, sign-in label, and endpoint URLs.
                  </p>
                </template>

                <v-text-field
                  v-model="oidcConfig.issuer"
                  label="Issuer URL"
                  :rules="oidcRules.issuer"
                  :disabled="isSaving || !oidcConfig.enabled"
                  type="text"
                  hint="e.g. https://auth.example.com/realms/myrealm"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="oidcConfig.clientId"
                  label="Client ID"
                  :rules="oidcRules.clientId"
                  :disabled="isSaving || !oidcConfig.enabled"
                  type="text"
                  hint="OIDC client ID from your identity provider"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="oidcConfig.clientSecret"
                  label="Client Secret"
                  :rules="oidcRules.clientSecret"
                  :disabled="isSaving || !oidcConfig.enabled"
                  type="password"
                  hint="OIDC client secret (masked for security)"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="oidcConfig.signInWithName"
                  label="Sign-in button suffix"
                  :rules="oidcRules.signInWithName"
                  :disabled="isSaving || !oidcConfig.enabled"
                  type="text"
                  hint="Text after “Sign in with” on login and sign-up (leave empty for SSO)"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-btn
                  color="secondary"
                  variant="tonal"
                  class="mb-4"
                  :disabled="isSaving || !oidcConfig.enabled || !oidcConfig.issuer?.trim() || isFetchingOidcEndpoints"
                  :loading="isFetchingOidcEndpoints"
                  @click="fetchOidcEndpoints"
                >
                  Fetch endpoints from issuer
                </v-btn>

                <v-text-field
                  v-model="oidcConfig.authorizeUrl"
                  label="Authorization endpoint URL"
                  :rules="oidcRules.authorizeUrl"
                  :disabled="isSaving || !oidcConfig.enabled"
                  type="text"
                  hint="Paste from your IdP or use Fetch endpoints from issuer"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="oidcConfig.tokenUrl"
                  label="Token endpoint URL"
                  :rules="oidcRules.tokenUrl"
                  :disabled="isSaving || !oidcConfig.enabled"
                  type="text"
                  hint="Paste from your IdP or use Fetch endpoints from issuer"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-model="oidcConfig.userinfoUrl"
                  label="Userinfo endpoint URL"
                  :rules="oidcRules.userinfoUrl"
                  :disabled="isSaving || !oidcConfig.enabled"
                  type="text"
                  hint="Paste from your IdP or use Fetch endpoints from issuer"
                  persistent-hint
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  :model-value="oidcRedirectUri"
                  label="Redirect URI"
                  readonly
                  hint="Use this redirect URI when configuring your OIDC client"
                  persistent-hint
                  class="mb-2"
                >
                  <template v-slot:append>
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      size="small"
                      @click="copyToClipboard(oidcRedirectUri)"
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
      githubConfig: {
        enabled: false,
        clientId: '',
        clientSecret: '',
      },
      oidcConfig: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        issuer: '',
        authorizeUrl: '',
        tokenUrl: '',
        userinfoUrl: '',
        signInWithName: '',
      },
      isFetchingOidcEndpoints: false,
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
      githubRules: {
        clientId: [
          v => {
            if (!this.githubConfig.enabled) return true;
            return !!v || 'Client ID is required when GitHub OAuth is enabled';
          }
        ],
        clientSecret: [
          v => {
            if (!this.githubConfig.enabled) return true;
            return !!v || 'Client Secret is required when GitHub OAuth is enabled';
          }
        ],
      },
      oidcRules: {
        issuer: [
          v => {
            if (!this.oidcConfig.enabled) return true;
            return !!v?.trim() || 'Issuer URL is required when OIDC is enabled';
          }
        ],
        clientId: [
          v => {
            if (!this.oidcConfig.enabled) return true;
            return !!v?.trim() || 'Client ID is required when OIDC is enabled';
          }
        ],
        clientSecret: [
          v => {
            if (!this.oidcConfig.enabled) return true;
            return !!v?.trim() || 'Client Secret is required when OIDC is enabled';
          }
        ],
        signInWithName: [
          v => {
            if (!this.oidcConfig.enabled) return true;
            if (!v || !String(v).trim()) return true;
            return String(v).trim().length <= 20 || 'Use at most 20 characters';
          }
        ],
        authorizeUrl: [
          v => {
            if (!this.oidcConfig.enabled) return true;
            return !!v?.trim() || 'Authorization endpoint URL is required when OIDC is enabled';
          }
        ],
        tokenUrl: [
          v => {
            if (!this.oidcConfig.enabled) return true;
            return !!v?.trim() || 'Token endpoint URL is required when OIDC is enabled';
          }
        ],
        userinfoUrl: [
          v => {
            if (!this.oidcConfig.enabled) return true;
            return !!v?.trim() || 'Userinfo endpoint URL is required when OIDC is enabled';
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
    ...mapState('auth', ['user', 'accessToken']),
    ...mapGetters('app', ['siteConfig']),
    googleRedirectUri() {
      const baseUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, '') || window.location.origin;
      return `${baseUrl}/oauth/google/callback`;
    },
    githubRedirectUri() {
      const baseUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, '') || window.location.origin;
      return `${baseUrl}/oauth/github/callback`;
    },
    oidcRedirectUri() {
      const baseUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, '') || window.location.origin;
      return `${baseUrl}/oauth/oidc/callback`;
    },
  },
  watch: {
    'siteConfig': {
      handler(newVal) {
        if (newVal && newVal.oauth?.providers) {
          if (newVal.oauth.providers.google && !this.googleConfig.clientId) {
            this.googleConfig = {
              enabled: newVal.oauth.providers.google.enabled || false,
              clientId: newVal.oauth.providers.google.clientId || '',
              clientSecret: newVal.oauth.providers.google.clientSecret || '',
            };
          }
          if (newVal.oauth.providers.github && !this.githubConfig.clientId) {
            this.githubConfig = {
              enabled: newVal.oauth.providers.github.enabled || false,
              clientId: newVal.oauth.providers.github.clientId || '',
              clientSecret: newVal.oauth.providers.github.clientSecret || '',
            };
          }
          if (newVal.oauth.providers.oidc && !this.oidcConfig.clientId) {
            const o = newVal.oauth.providers.oidc;
            this.oidcConfig = {
              enabled: o.enabled || false,
              clientId: o.clientId || '',
              clientSecret: o.clientSecret || '',
              issuer: o.issuer || '',
              authorizeUrl: o.authorizeUrl || '',
              tokenUrl: o.tokenUrl || '',
              userinfoUrl: o.userinfoUrl || '',
              signInWithName: o.signInWithName || '',
            };
          }
        }
      },
      immediate: true,
      deep: true
    },
    'googleConfig.enabled'() {
      // Trigger validation when enabled state changes
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.validate();
        }
      });
    },
    'githubConfig.enabled'() {
      // Trigger validation when enabled state changes
      this.$nextTick(() => {
        if (this.$refs.form) {
          this.$refs.form.validate();
        }
      });
    },
    'oidcConfig.enabled'() {
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
            github: {
              enabled: this.githubConfig.enabled,
              clientId: this.githubConfig.clientId.trim(),
              clientSecret: this.githubConfig.clientSecret.trim(),
              redirectUri: this.githubRedirectUri,
            },
            oidc: {
              enabled: this.oidcConfig.enabled,
              clientId: this.oidcConfig.clientId.trim(),
              clientSecret: this.oidcConfig.clientSecret.trim(),
              redirectUri: this.oidcRedirectUri,
              issuer: this.oidcConfig.issuer.trim(),
              authorizeUrl: (this.oidcConfig.authorizeUrl || '').trim(),
              tokenUrl: (this.oidcConfig.tokenUrl || '').trim(),
              userinfoUrl: (this.oidcConfig.userinfoUrl || '').trim(),
              signInWithName: (this.oidcConfig.signInWithName || '').trim().slice(0, 20),
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
    },
    async fetchOidcEndpoints() {
      this.isFetchingOidcEndpoints = true;
      try {
        const baseUrl = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, '') || window.location.origin;
        const res = await fetch(`${baseUrl}/oidc-discovery`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.accessToken,
          },
          body: JSON.stringify({ issuer: this.oidcConfig.issuer.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Discovery failed (${res.status})`);
        }
        this.oidcConfig.authorizeUrl = data.authorizeUrl || '';
        this.oidcConfig.tokenUrl = data.tokenUrl || '';
        this.oidcConfig.userinfoUrl = data.userinfoUrl || '';
        this.showMessage('Endpoints loaded from issuer', 'success');
        this.$nextTick(() => {
          if (this.$refs.form) {
            this.$refs.form.validate();
          }
        });
      } catch (e) {
        console.error(e);
        this.showMessage(e.message || 'OIDC discovery failed', 'error');
      } finally {
        this.isFetchingOidcEndpoints = false;
      }
    },
  }
}
</script>

<style scoped>
</style>
