// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { OAuthStrategy } from '@feathersjs/authentication-oauth'
import { BadRequest } from '@feathersjs/errors'
import { refNameHasher } from '../refNameFunctions.js'

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
   * Create new user from OAuth profile
   * @param {Object} profile - OAuth profile
   * @param {string} providerId - Provider ID
   * @returns {Object} Created user
   */
  async createOAuthUser(profile, providerId) {
    const userService = this.app.service('users')
    const baseUsername = this.generateUsernameFromEmail(profile.email)

    // Check for username conflicts and append number if needed
    let username = baseUsername
    let counter = 1
    while (true) {
      const hash = refNameHasher(username)
      const existing = await userService.find({
        query: { usernameHash: hash },
        paginate: false
      })
      if (existing.length === 0) {
        break
      }
      username = `${baseUsername}${counter}`
      counter++
    }

    const userData = {
      email: profile.email,
      username: username,
      name: profile.name || profile.email.split('@')[0],
      usageType: 'personal',
      oauthProviders: {
        [this.name]: {
          id: providerId
        }
      }
    }

    return await userService.create(userData)
  }

  /**
   * Authenticate user via OAuth
   * Checks provider ID first, then email, then creates new user
   */
  async authenticate(authentication, originalParams) {
    const { provider, ...params } = originalParams
    const profile = await this.getProfile(authentication, params)
    const providerId = this.getProviderId(profile)

    const existingUserByProviderId = await this.findUserByProviderId(providerId)
    if (existingUserByProviderId) {
      return existingUserByProviderId
    }

    const existingUserByEmail = await this.findUserByEmail(profile.email)
    if (existingUserByEmail) {
      throw new BadRequest(
        `An account with email ${profile.email} already exists. Please login with your existing credentials to link your Google account.`,
        {
          code: 'OAUTH_ACCOUNT_EXISTS',
          email: profile.email
        }
      )
    }

    const newUser = await this.createOAuthUser(profile, providerId)
    return newUser
  }
}
