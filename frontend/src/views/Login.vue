<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <Main>
    <template #title>
    </template>
    <template #content>
      <v-sheet
        class="d-flex flex-row flex-md-column flex-wrap justify-center align-center"
      >
        <v-card
          v-if="siteConfig?.homepageContent?.banner?.enabled"
          :style="{ backgroundColor: siteConfig.homepageContent.banner.color, color: getTextColorForBackground(siteConfig.homepageContent.banner.color) }"
          class="compact-banner"
        >
          <v-card-title>{{ siteConfig.homepageContent.banner.title }}</v-card-title>
          <v-card-text>
            <markdown-viewer :markdown-html="bannerMarkdownHtml"></markdown-viewer>
          </v-card-text>
        </v-card>
        <p></p>
        <v-card :title="`Login to ${siteConfig?.siteTitle}`" width="26em" class="pa-2 mt-16">
          <v-card-text :class="{ 'pb-6': !(isGoogleOAuthEnabled || isGitHubOAuthEnabled) }">
            <template v-slot:loader="{ isActive }">
              <v-progress-linear
                :active="isAuthenticatePending"
                height="4"
                indeterminate
              ></v-progress-linear>
            </template>
            <v-form v-model="isValid" @submit.prevent="login">
              <v-text-field
                v-model="user.email"
                label="Email"
                :rules="[rules.isRequired, rules.isEmail]"
                :disabled="isAuthenticatePending"
                autofocus
              ></v-text-field>

              <v-text-field
                v-model="user.password"
                label="Password"
                type="password"
                :rules="[rules.isRequired]"
                :disabled="isAuthenticatePending"
              ></v-text-field>

              <v-row justify="end" class="mt-1 mb-2">
                <v-btn
                  size="x-small"
                  color="secondary"
                  variant="text"
                  @click.stop="openForgotPasswordDialog()">
                  Forgot Password?
                </v-btn>
                <ForgotPasswordDialog
                  :is-active="isForgotPasswordDialogActive"
                  ref="forgotPasswordDialog"
                />
              </v-row>

              <v-row justify="center" class="mt-2">
                <v-btn
                  type="submit"
                  v-bind:disabled="isAuthenticatePending"
                  color="primary"
                  variant="elevated"
                >Submit</v-btn>
              </v-row>

              <v-row v-if="isGoogleOAuthEnabled || isGitHubOAuthEnabled" class="mt-4">
                <v-col cols="12">
                  <div class="d-flex align-center my-2">
                    <v-divider></v-divider>
                    <span class="mx-4 text-grey">OR</span>
                    <v-divider></v-divider>
                  </div>
                </v-col>
              </v-row>
              <div v-if="isOAuthRedirecting && (isGoogleOAuthEnabled || isGitHubOAuthEnabled)" class="d-flex flex-column align-center justify-center mt-4" style="min-height: 40px;">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="40"
                  width="4"
                ></v-progress-circular>
                <span class="mt-2 text-caption text-grey">Redirecting to {{ oAuthRedirectingProvider === 'google' ? 'Google' : 'GitHub' }}...</span>
              </div>
              <v-row v-else-if="isGoogleOAuthEnabled || isGitHubOAuthEnabled">
                <v-col v-if="isGoogleOAuthEnabled" cols="12" class="text-center" style="position: relative;">
                  <img 
                    src="/img/google-signin-button.svg" 
                    alt="Sign in with Google"
                    @click="!isAuthenticatePending && loginWithOAuth('google')"
                    :style="{ 
                      height: '40px', 
                      width: 'auto', 
                      cursor: isAuthenticatePending ? 'not-allowed' : 'pointer',
                      opacity: isAuthenticatePending ? 0.6 : 1,
                      display: 'block',
                      margin: '0 auto'
                    }"
                    class="google-signin-button"
                  />
                </v-col>
                <v-col v-if="isGitHubOAuthEnabled" cols="12" class="text-center" style="position: relative;">
                  <v-btn
                    variant="outlined"
                    size="large"
                    :disabled="isAuthenticatePending"
                    @click="!isAuthenticatePending && loginWithOAuth('github')"
                    :style="{ 
                      height: '40px',
                      width: 'auto',
                      cursor: isAuthenticatePending ? 'not-allowed' : 'pointer',
                      opacity: isAuthenticatePending ? 0.6 : 1,
                      display: 'inline-flex',
                      backgroundColor: '#FFFFFF',
                      borderColor: '#747775',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      color: '#3c4043 !important',
                      textTransform: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      letterSpacing: '0.25px',
                      padding: '0 16px'
                    }"
                    class="github-signin-button"
                  >
                    <v-icon start size="18" style="margin-right: 10px; color: #24292f;">mdi-github</v-icon>
                    <span style="color: #3c4043;">Sign in with GitHub</span>
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
            <v-snackbar
              :timeout="2000"
              v-model="showSnacker"
            >
              {{ snackerMsg }}
            </v-snackbar>
          </v-card-text>
        </v-card>
        <v-card
          width="26em"
          class="pa-2 mx-2"
          v-if="isRedirectedFromDownloadPage"
        >
          <v-card-title>...redirect from download page</v-card-title>
          <v-card-text>
            <p>&nbsp;</p>
            <p>
              You have been redirected from the Download & Explore page. To reach that page, you must be logged in.
            </p>
            <p>&nbsp;</p>
            <p>
              If you don’t have an account, visit <v-btn density="compact" class="mx-2" color="blue" variant="tonal" :to="{ name: 'SignUp' }">Signup</v-btn> to create a new account
            </p>
            <p>&nbsp;</p>
            <p>
              If you <b>do</b> have an account, just login using the form on the left. You will then be automatically sent to the page.
            </p>
          </v-card-text>
        </v-card>
      </v-sheet>
    </template>
  </Main>
</template>

<script>
import {mapState, mapActions, mapGetters} from 'vuex';
import { marked } from 'marked';
import { models } from '@feathersjs/vuex';
import { resetStores } from '@/store';
import ForgotPasswordDialog from "@/components/ForgotPasswordDialog.vue";
import MarkdownViewer from '@/components/MarkdownViewer.vue';
import Main from '@/layouts/default/Main.vue';
import { getTextColorForBackground } from '@/genericHelpers';


export default {
  name: 'Login',
  components: {ForgotPasswordDialog, Main},
  components: {ForgotPasswordDialog, MarkdownViewer, Main},
  data() {
    return {
      result: {},
      user: {
        email: '',
        password: '',
      },
      isValid: false,
      rules: {
        isEmail: v => /.+@.+/.test(v) || 'Invalid Email address',
        isRequired: v => !!v || 'This field is required',
      },
      snackerMsg: '',
      showSnacker: false,
      isForgotPasswordDialogActive: false,
      isRedirectedFromDownloadPage: false,
      isOAuthRedirecting: false,
      oAuthRedirectingProvider: null,
    }
  },
  computed: {
    User: () => models.api.User,
    ...mapState('auth', ['isAuthenticatePending']),
    ...mapGetters('app', { userCurrentOrganization: 'currentOrganization', siteConfig: 'siteConfig' }),
    bannerMarkdownHtml() {
      return marked.parse(this.siteConfig?.homepageContent?.banner?.content || '');
    },
    isGoogleOAuthEnabled() {
      return this.siteConfig?.oauth?.providers?.google?.enabled === true;
    },
    isGitHubOAuthEnabled() {
      return this.siteConfig?.oauth?.providers?.github?.enabled === true;
    },
  },
  mounted() {
    resetStores();
    if (this.$route.query.redirect_uri) {
      if (this.$route.query.redirect_uri.endsWith('/download-and-explore')) {
        this.isRedirectedFromDownloadPage = true;
      }
    }
    // Handle OAuth errors
    if (this.$route.query.error) {
      this.snackerMsg = decodeURIComponent(this.$route.query.error);
      this.showSnacker = true;
      // Clean up URL by removing error query param
      const query = { ...this.$route.query };
      delete query.error;
      this.$router.replace({ query });
    }
  },
  methods: {
    ...mapActions('auth', ['authenticate']),
    getTextColorForBackground,
    async login() {
      if ( this.isValid ) {
        await this.authenticate({
          strategy: 'local',
          ...this.user,
        }).then(({ user }) => {
          if (this.$route.query.redirect_uri) {
            window.open(this.$route.query.redirect_uri, '_self');
            return;
          }
          if (this.userCurrentOrganization) {
            if (this.userCurrentOrganization.type === 'Personal') {
              this.$router.push({ name: 'UserWorkspaces', params: { id: user.username } });
            } else {
              this.$router.push({ name: 'OrganizationWorkspaces', params: { id: this.userCurrentOrganization.refName } });
            }
          } else {
            this.$router.push({ name: 'UserWorkspaces', params: { id: user.username } });
          }
        }).catch((e) => {
          this.showSnacker = true;
          this.snackerMsg = `Invalid login`;
          console.log(e);
        })
      }
    },
    openForgotPasswordDialog() {
      this.isForgotPasswordDialogActive = true;
      this.$refs.forgotPasswordDialog.$data.dialog = true;
    },
    loginWithOAuth(provider) {
      if (this.isOAuthRedirecting || this.isAuthenticatePending) {
        return;
      }

      this.isOAuthRedirecting = true;
      this.oAuthRedirectingProvider = provider;
      // Small delay to show loading state before redirect
      setTimeout(() => {
        window.location.href = `${import.meta.env.VITE_APP_API_URL}oauth/${provider}`;
      }, 100);
    },
  }
}
</script>

<style scoped>
::v-deep(.compact-banner .markdown h1),
::v-deep(.compact-banner .markdown h2) {
  margin: 0.25em 0;
}

</style>
