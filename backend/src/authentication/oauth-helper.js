// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { OAuthStrategy } from '@feathersjs/authentication-oauth'

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
   * Authenticate user via Google OAuth
   */
  async authenticate(authentication, originalParams) {
    const { provider, ...params } = originalParams
    const profile = await this.getProfile(authentication, params)
    
    console.log('Google OAuth profile fetched:', {
      email: profile.email,
      sub: profile.sub,
      name: profile.name
    })
    
    // User creation/login will be implemented here
    throw new Error('OAuth authentication successful. User handling not yet implemented.')
  }
}
