<!--
SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <v-container fluid>
    <signup-progress-bar step="0" msg="start with the form"></signup-progress-bar>
    <v-card class="mx-auto mt-8" width="28em" flat>
      <v-card-title class="text-center pb-4">{{ `Sign Up to ${siteConfig?.siteTitle}` }}</v-card-title>
      <template v-slot:loader="{  }">
        <v-progress-linear
          :active="isCreatePending"
          height="4"
          indeterminate
        ></v-progress-linear>
      </template>
      <v-card-text v-if="isGoogleOAuthEnabled || isGitHubOAuthEnabled" class="pb-4">
        <div v-if="isOAuthRedirecting && (isGoogleOAuthEnabled || isGitHubOAuthEnabled)" class="d-flex flex-column align-center justify-center" style="min-height: 40px;">
          <v-progress-circular
            indeterminate
            color="primary"
            size="40"
            width="4"
          ></v-progress-circular>
          <span class="mt-2 text-caption text-grey">Redirecting to {{ oAuthRedirectingProvider === 'google' ? 'Google' : 'GitHub' }}...</span>
        </div>
        <v-row v-else-if="isGoogleOAuthEnabled || isGitHubOAuthEnabled" no-gutters>
          <v-col v-if="isGoogleOAuthEnabled" :cols="isGitHubOAuthEnabled ? 6 : 12" class="text-center" :class="isGitHubOAuthEnabled ? 'pr-1' : ''" style="position: relative;">
            <img 
              src="/img/google-signin-button.svg" 
              alt="Sign in with Google"
              @click="!isCreatePending && loginWithOAuth('google')"
              :style="{ 
                height: '40px', 
                width: 'auto', 
                cursor: isCreatePending ? 'not-allowed' : 'pointer',
                opacity: isCreatePending ? 0.6 : 1,
                display: 'block',
                margin: '0 auto'
              }"
              class="google-signin-button"
            />
          </v-col>
          <v-col v-if="isGitHubOAuthEnabled" :cols="isGoogleOAuthEnabled ? 6 : 12" class="text-center" :class="isGoogleOAuthEnabled ? 'pl-1' : ''" style="position: relative;">
            <v-btn
              variant="outlined"
              size="large"
              :disabled="isCreatePending"
              @click="!isCreatePending && loginWithOAuth('github')"
              :style="{ 
                height: '40px',
                width: 'auto',
                cursor: isCreatePending ? 'not-allowed' : 'pointer',
                opacity: isCreatePending ? 0.6 : 1,
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
        <div v-if="isGoogleOAuthEnabled || isGitHubOAuthEnabled" class="d-flex align-center my-3">
          <v-divider></v-divider>
          <span class="mx-4 text-grey">OR</span>
          <v-divider></v-divider>
        </div>
      </v-card-text>
      <v-form v-model="isValid" ref="form" @submit.prevent="signUp">
        <v-text-field
          v-model="user.email"
          label="Email"
          :rules="[rules.isRequired, rules.isEmail, rules.extraHint]"
          :disabled="isCreatePending"
          autofocus
        ></v-text-field>

        <v-text-field
          v-model="user.name"
          label="Name"
          :rules="[rules.isRequired]"
          :disabled="isCreatePending"
        ></v-text-field>

        <v-text-field
          v-model="user.password"
          type="password"
          label="Password"
          :rules="[rules.isRequired, rules.minCharacter]"
          :disabled="isCreatePending"
        ></v-text-field>

        <v-text-field
          v-model="confirmPassword"
          type="password"
          label="Confirm Password"
          :rules="[rules.isRequired, rules.confirmPassword]"
          :disabled="isCreatePending"
        ></v-text-field>

        <v-select
          v-model="user.usageType"
          :label="`How do you plan to use ${siteConfig?.siteTitle}?`"
          :items="usageTypes"
          :rules="[rules.isRequired]"
          :disabled="isCreatePending"
        />


        <v-text-field
          v-model="usernameTemp"
          label="username builder (type here)"
          :rules="[rules.isRequired, rules.nameConforms, rules.extraHint]"
          :disabled="isCreatePending"
        ></v-text-field>

        <v-card class="mx-auto" color="primary" variant="outlined">
          <v-card-text v-if="user.username">
            <span class="font-weight-bold">{{user.username}}</span>
          </v-card-text>
          <v-card-text v-else>
            <span class="font-italic">no username built yet</span>
          </v-card-text>
        </v-card>

        <v-checkbox
          v-model="agreeToTOS"
          :rules="[rules.confirmTOS]"
          :disabled="isCreatePending"
          density="compact"
        >
          <template v-slot:label>
            <div>
              I understand
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                  <a
                    v-bind="props"
                    @click.stop="tosDialog = true"
                  >
                    <span class="font-weight-medium text-decoration-underline text-black">
                      Terms of Service
                    </span>
                  </a>
                </template>
                Click to read Terms of Service
              </v-tooltip>
            </div>
          </template>
        </v-checkbox>

        <v-checkbox
          v-model="agreeToPrivacyPolicy"
          :rules="[rules.confirmPP]"
          :disabled="isCreatePending"
          density="compact"
        >
          <template v-slot:label>
            <div>
              I understand
              <v-tooltip location="bottom">
                <template v-slot:activator="{ props }">
                  <a
                    v-bind="props"
                    @click.stop="ppDialog = true"
                  >
                    <span class="font-weight-medium text-decoration-underline text-black">
                      Privacy Policy
                    </span>
                  </a>
                </template>
                Click to read Privacy Policy
              </v-tooltip>
            </div>
          </template>

        </v-checkbox>

        <v-card-actions>
          <v-btn
            type="submit"
            :disabled="isCreatePending"
            class="mt-2"
            color="primary"
            block
            variant="elevated"
          >Submit</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
    <v-snackbar
      :timeout="2000"
      v-model="showSnacker"
    >
      {{ snackerMsg }}
    </v-snackbar>
    <v-dialog
      v-model="tosDialog"
    >
      <v-card>
        <v-card-title>{{ tosDoc.current.title }}</v-card-title>
        <v-card-subtitle>ver {{ tosDoc.current.version }}</v-card-subtitle>
        <v-card-text>
          <markdown-viewer :markdown-html="tosMarkdown"></markdown-viewer>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="tosDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
      v-model="ppDialog"
    >
      <v-card>
        <v-card-title>{{ ppDoc.current.title }}</v-card-title>
        <v-card-subtitle>ver {{ ppDoc.current.version }}</v-card-subtitle>
        <v-card-text>
          <markdown-viewer :markdown-html="ppMarkdown"></markdown-viewer>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="ppDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>

</template>

<script>
import {mapActions, mapGetters, mapState} from 'vuex';
import { models } from '@feathersjs/vuex';
import {marked} from "marked";
import {conformRefName} from "@/refNameFunctions";
import SignupProgressBar from "@/components/SignupProgressBar.vue";
import MarkdownViewer from "@/components/MarkdownViewer.vue";

export default {
  name: 'SignUp',
  components: {MarkdownViewer, SignupProgressBar},
  data() {
    return {
      result: {},
      user: new models.api.User(),
      usernameTemp: '',
      acceptAgreement: new models.api.AcceptAgreement(),
      confirmPassword: '',
      isValid: false,
      snackerMsg: '',
      rules: {
        isEmail: v => /^\S+@\S+\.\S+$/.test(v) || 'Invalid Email address',
        isRequired: v => !!v || 'This field is required',
        minCharacter: v => (v && v.length >= 8) || 'Minimum 8 characters',
        confirmPassword: v => v === this.user.password || 'Password must match',
        confirmTOS: v => v || 'Terms of Service must be understood',
        confirmPP: v => v || 'Privacy Policy must be understood',
        nameConforms: v => this.conformNameCheck(v),
        extraHint: v => this.extraHintCheck(v),
      },
      agreeToTOS: false,
      agreeToPrivacyPolicy: false,
      showSnacker: false,
      tosDoc: {},
      tosMarkdown: '',
      tosDialog: false,
      ppDoc: {},
      ppMarkdown: '',
      ppDialog: false,
      extraHintContent: '',
      lastBadUsername: '',
      lastBadEmail: '',
      isOAuthRedirecting: false,
      oAuthRedirectingProvider: null,
    }
  },
  computed: {
    User: () => models.api.User,
    ...mapGetters('app', ['siteConfig']),
    ...mapState('users', ['isCreatePending']),
    isGoogleOAuthEnabled() {
      return this.siteConfig?.oauth?.providers?.google?.enabled === true;
    },
    isGitHubOAuthEnabled() {
      return this.siteConfig?.oauth?.providers?.github?.enabled === true;
    },
    usageTypes() {
      return [
        { value: 'work', title: `I want to use ${this.siteConfig?.siteTitle} for work` },
        { value: 'personal', title: `I want to use ${this.siteConfig?.siteTitle} for personal projects` },
        { value: 'both', title: `I want to use ${this.siteConfig?.siteTitle} for both work and personal projects` }
      ];
    }
  },
  methods: {
    ...mapActions('auth', ['authenticate']),
    async sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    async signUp() {
      if (this.isValid) {
        await this.user.create()
          .then(async () => {
            // post agreement to TOS
            this.acceptAgreement.userId = this.user._id;
            this.acceptAgreement.category = 'terms-of-service';
            this.acceptAgreement.version = this.tosDoc.current.version;
            this.acceptAgreement.newAccount = true;
            await this.acceptAgreement.create();
            await this.sleep(200);  // wait for mongodb to distribute
            await this.login(); // now use the new db data
            this.$router.push({name: 'RedirectToPendingVerification'}); //.then(() => { this.$router.go() })
          })
          .catch((e) => {
            if (e.message === 'Invalid: Username already taken') {
              this.extraHintContent = 'username already taken';
              this.lastBadUsername = this.usernameTemp;
              this.$refs.form.validate();
            }
            if (e.message === 'Invalid: Email already taken') {
              this.extraHintContent = 'email already taken';
              this.lastBadEmail = this.user.email;
              this.$refs.form.validate();
            }
            console.log(e.message);
            this.snackerMsg = e.message;
            this.showSnacker = true;
          });
      }
    },
    async login() {
      await this.authenticate({
        strategy: 'local',
        ...this.user,
      }).then(() => {
      }).catch((e) => {
        console.log(e.message);
        // do nothing if it fails; it is quite possible that the new user has not fully distributed into
        // MongoDB given the short turn around. This becomes more likely as we get bigger.
      })
    },
    conformNameCheck(rawName) {
      const conformedName = conformRefName(rawName);
      this.user.username = conformedName;
      if (conformedName.length < 4) {
        return "requires at least 4 characters in derived username";
      }
      return true;
    },
    loginWithOAuth(provider) {
      if (this.isOAuthRedirecting || this.isCreatePending) {
        return;
      }

      this.isOAuthRedirecting = true;
      this.oAuthRedirectingProvider = provider;
      // Small delay to show loading state before redirect
      setTimeout(() => {
        window.location.href = `${import.meta.env.VITE_APP_API_URL}oauth/${provider}`;
      }, 100);
    },
    extraHintCheck(newRawString) {
      if (this.extraHintContent === '') {
        return true;
      }
      if (this.lastBadUsername === newRawString) {
        return this.extraHintContent;
      }
      if (this.lastBadEmail === newRawString) {
        return this.extraHintContent;
      }
      return true;
    }
  },
  created() {
    models.api.Agreements.find({
      query: {category: 'terms-of-service'}
    }).then(response => {
        this.tosDoc = (response.data.length > 0) ? response.data[0] : {current:{markdownContent: 'doc missing'}};
        this.tosMarkdown =  marked.parse(this.tosDoc.current.markdownContent);
    });
    models.api.Agreements.find({
      query: {category: 'privacy-policy'}
    }).then(response => {
      this.ppDoc = (response.data.length > 0) ? response.data[0] : {current:{markdownContent: 'doc missing'}};
      this.ppMarkdown =  marked.parse(this.ppDoc.current.markdownContent);
    });
  },
}
</script>

<style scoped>

</style>
