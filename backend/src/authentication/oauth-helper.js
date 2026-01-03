// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { OAuthStrategy } from '@feathersjs/authentication-oauth'
import crypto from 'crypto'

/**
 * Create HMAC signature for OAuth completion data
 * @param {string} encodedData - Base64 encoded OAuth data
 * @param {number} expires - Expiration timestamp (Unix epoch seconds)
 * @param {string} secret - HMAC secret key
 * @returns {string} Hex-encoded HMAC signature
 */
export function createOAuthCompletionSignature(encodedData, expires, secret) {
  return crypto
    .createHmac('sha512', secret)
    .update(`${encodedData}:${expires}`)
    .digest('hex')
}

/**
 * Verify HMAC signature for OAuth completion data
 * @param {string} encodedData - Base64 encoded OAuth data
 * @param {number} expires - Expiration timestamp (Unix epoch seconds)
 * @param {string} signature - Hex-encoded HMAC signature to verify
 * @param {string} secret - HMAC secret key
 * @returns {{valid: boolean, error: string}} Validation result with error message if invalid
 */
export function verifyOAuthCompletionSignature(encodedData, expires, signature, secret) {
  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (now > expires) {
    return { valid: false, error: 'OAuth signup link has expired. Please try signing in again.' }
  }

  // Verify signature
  const expectedSignature = createOAuthCompletionSignature(encodedData, expires, secret)
  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signup link. Please try signing in again.' }
  }

  return { valid: true, error: '' }
}

/**
 * Google OAuth Strategy
 */
export class GoogleStrategy extends OAuthStrategy {
  /**
   * Extract Google provider ID from profile
   */
  getProviderId(profile) {
    return profile.sub || profile.id
  }

  /**
   * Fetch user profile from Google's OpenID Connect endpoint
   */
  async getProfile(data, params) {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${data.access_token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user profile from Google')
    }

    const profile = await response.json()

    if (!profile.email) {
      throw new Error('Email is required but not provided by Google OAuth')
    }

    return profile
  }

  /**
   * Find user by OAuth provider ID
   * @param {string} providerId - Provider-specific user ID
   * @returns {Object|null} User object or null if not found
   */
  async findUserByProviderId(providerId) {
    const userService = this.app.service('users')
    const result = await userService.find({
      query: {
        [`oauthProviders.${this.name}.id`]: providerId
      },
      paginate: false
    })
    return result.length > 0 ? result[0] : null
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object|null} User object or null if not found
   */
  async findUserByEmail(email) {
    const userService = this.app.service('users')
    const result = await userService.find({
      query: { email },
      paginate: false
    })
    return result.length > 0 ? result[0] : null
  }

  /**
   * Generate username from email (for OAuth users)
   * @param {string} email - User email
   * @returns {string} Username derived from email
   */
  generateUsernameFromEmail(email) {
    const baseUsername = email.split('@')[0].toLowerCase()
    return baseUsername.replace(/[^a-z0-9_]/g, '')
  }

  /**
   * Override getRedirect to handle OAuth redirects to frontend
   * Handles three scenarios: errors, new users (signup completion), and existing users (auto-login)
   * @param {Object | Error} data - Authentication result data or error
   * @param {Object} [params] - Request parameters
   * @returns {Promise<string | null>} Redirect URL or null
   */
  async getRedirect(data, params) {
    const frontendUrl = this.app.get('frontendUrl')

    // If authentication failed, redirect to frontend login with error
    const errorMessage = data.error || data.message
    if (errorMessage) {
      return `${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`
    }

    // For new users, redirect to completion page with HMAC-signed OAuth data
    // Check oauthProfile FIRST: auth service.create() adds accessToken to all results (even without user entity)
    if (data.oauthProfile && data.providerId) {
      const { oauthProfile, providerId } = data

      const oauthData = {
        provider: this.name,
        email: oauthProfile.email,
        name: oauthProfile.name || oauthProfile.email.split('@')[0],
        providerId: providerId,
        suggestedUsername: this.generateUsernameFromEmail(oauthProfile.email)
      }

      const OAUTH_COMPLETION_EXPIRY_SECONDS = 15 * 60 // 15 minutes
      const expires = Math.floor(Date.now() / 1000) + OAUTH_COMPLETION_EXPIRY_SECONDS
      const dataString = JSON.stringify(oauthData)
      const encodedData = Buffer.from(dataString).toString('base64')
      const secret = this.authentication.configuration.secret
      const signature = createOAuthCompletionSignature(encodedData, expires, secret)

      return `${frontendUrl}/oauth-complete?data=${encodeURIComponent(encodedData)}&expires=${expires}&signature=${signature}`
    }

    // For existing users, redirect with access token in hash fragment for auto-login
    // Hash fragment is used for security (not sent to server, not logged)
    if (data.accessToken && data.user) {
      return `${frontendUrl}/oauth-complete#access_token=${data.accessToken}`
    }

    return await super.getRedirect(data, params)
  }

  /**
   * Create login token for user
   * @param {Object} user - User object
   * @returns {Promise<Object>} Object with user and accessToken
   */
  async createLoginToken(user) {
    const userId = user._id.toString()
    const payload = { sub: userId }
    const accessToken = await this.authentication.createAccessToken(payload)

    return {
      user: user,
      accessToken: accessToken
    }
  }

  /**
   * Authenticate user via OAuth
   * @param {Object} authentication - Authentication request data
   * @param {Object} originalParams - Request parameters
   * @returns {Promise<Object>} Authentication result:
   *   - For existing users by provider ID: { user, accessToken }
   *   - For existing users by email: { user, accessToken } (auto-links OAuth provider)
   *   - For new users: { oauthProfile, providerId } (triggers redirect to completion flow)
   */
  async authenticate(authentication, originalParams) {
    const { provider, ...params } = originalParams
    const profile = await this.getProfile(authentication, params)
    const providerId = this.getProviderId(profile)

    const existingUserByProviderId = await this.findUserByProviderId(providerId)
    if (existingUserByProviderId) {
      return await this.createLoginToken(existingUserByProviderId)
    }

    const existingUserByEmail = await this.findUserByEmail(profile.email)
    if (existingUserByEmail) {
      // Link OAuth provider to existing account and auto-login
      const userService = this.app.service('users')
      const userId = existingUserByEmail._id.toString()

      if (!existingUserByEmail.oauthProviders) {
        existingUserByEmail.oauthProviders = {}
      }
      existingUserByEmail.oauthProviders[this.name] = {
        id: providerId
      }

      await userService.patch(userId, {
        oauthProviders: existingUserByEmail.oauthProviders
      })

      const updatedUser = await userService.get(userId)

      return await this.createLoginToken(updatedUser)
    }

    // For new users, return OAuth profile data to use in oauth signup completion flow
    return {
      oauthProfile: profile,
      providerId: providerId
    }
  }
}
