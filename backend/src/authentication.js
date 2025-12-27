// SPDX-FileCopyrightText: 2024 Ondsel <development@ondsel.com>
// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// For more information about this file see https://dove.feathersjs.com/guides/cli/authentication.html
import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'
import { oauth } from '@feathersjs/authentication-oauth'
import { NotFound } from '@feathersjs/errors'
import { GoogleStrategy } from './authentication/oauth-helper.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const grantOAuthDefaults = require('grant/config/oauth.json')

const siteConfigId = '000000000000000000000000'

export const authentication = async (app) => {
  const authentication = new AuthenticationService(app, 'authentication', {
  })

  authentication.docs = authentication.docs = {
    idNames: {
      remove: 'accessToken',
    },
    idType: 'string',
    securities: ['remove', 'removeMulti'],
    multi: ['remove'],
    schemas: {
      authRequest: {
        type: 'object',
        properties: {
          strategy: { type: 'string' },
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
      authResult: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          authentication: {
            type: 'object',
            properties: {
              strategy: { type: 'string' },
            },
          },
          payload: {
            type: 'object',
            properties: {}, // TODO
          },
          user: { $ref: '#/components/schemas/User' },
        },
      },
    },
    refs: {
      createRequest: 'authRequest',
      createResponse: 'authResult',
      removeResponse: 'authResult',
      removeMultiResponse: 'authResult',
    },
    operations: {
      remove: {
        description: 'Logout the currently logged in user',
        'parameters[0].description': 'accessToken of the currently logged in user',
      },
      removeMulti: {
        description: 'Logout the currently logged in user',
        parameters: [],
      },
    },
  };


  authentication.register('jwt', new JWTStrategy())
  authentication.register('local', new LocalStrategy())

  app.use('authentication', authentication)

  await configureOAuth(app, authentication)
}

/**
 * Configure OAuth authentication with dynamic configuration support
 * Allows OAuth credentials to be updated from admin panel without server restart
 */
async function configureOAuth(app, authentication) {
  app.set('oauthProviderConfigs', {})

  // Load OAuth config from site-config
  try {
    const siteConfig = await app.service('site-config').get(siteConfigId)
    updateOAuthProviderConfigs(app, siteConfig)
  } catch (error) {
    if (error.code === 404 || error.className === 'not-found') {
      console.log('Site-config not found - OAuth will be available after migrations run')
    } else {
      console.error('Error loading OAuth config from site-config:', error)
    }
  }

  const providerConfigs = app.get('oauthProviderConfigs') || {}

  // Build OAuth config for Grant
  const oauthConfig = providerConfigs.google ? { google: { ...providerConfigs.google } } : {}

  const currentAuthConfig = app.get('authentication') || {}
  app.set('authentication', { ...currentAuthConfig, oauth: oauthConfig })

  authentication.register('google', new GoogleStrategy())
  app.configure(oauth())

  // Patch OAuthService handler to support dynamic config updates
  const oauthService = app.service('oauth/:provider')
  if (oauthService) {
    const originalHandler = oauthService.handler.bind(oauthService)

    oauthService.handler = async function (method, params, body, override) {
      const provider = params?.route?.provider

      if (provider) {
        const configs = app.get('oauthProviderConfigs') || {}
        const providerConfig = configs[provider]

        if (!providerConfig) {
          throw new NotFound(`OAuth provider '${provider}' is not configured`)
        }

        if (this.grant?.config) {
          this.grant.config[provider] = { ...providerConfig }
        }
      }

      return originalHandler(method, params, body, override)
    }
  }

  // Store update function for site-config service hook
  app.set('updateOAuthConfig', (siteConfig) => {
    updateOAuthProviderConfigs(app, siteConfig)
  })
}

/**
 * Update OAuth provider configs from site-config
 */
function updateOAuthProviderConfigs(app, siteConfig) {
  const providerConfigs = {}

  const googleConfig = siteConfig?.oauth?.providers?.google
  if (googleConfig?.enabled && googleConfig.clientId && googleConfig.clientSecret) {
    providerConfigs.google = {
      ...grantOAuthDefaults.google,
      key: googleConfig.clientId,
      secret: googleConfig.clientSecret,
      scope: 'openid email profile',
      nonce: true,
      transport: 'state',
      response: ['tokens', 'raw', 'profile'],
      redirect_uri: googleConfig.redirectUri
    }
  }

  app.set('oauthProviderConfigs', providerConfigs)

  const currentAuthConfig = app.get('authentication') || {}
  const oauthConfig = { ...currentAuthConfig.oauth }

  Object.keys(providerConfigs).forEach((provider) => {
    oauthConfig[provider] = { ...providerConfigs[provider] }
  })

  app.set('authentication', {
    ...currentAuthConfig,
    oauth: oauthConfig
  })
}
