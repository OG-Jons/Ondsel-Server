// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ObjectId } from 'mongodb'
import { siteConfigId } from '../services/site-config/site-config.schema.js'

export async function seedDevKeycloakOidcSiteConfigCommand(app) {
  const keycloakPort = process.env.KEYCLOAK_PORT || '8090'
  const backendPort = process.env.PORT || '3030'
  const realm = process.env.KEYCLOAK_REALM || 'lens'
  const clientId = process.env.OIDC_CLIENT_ID || 'lens-backend'
  const clientSecret = process.env.OIDC_CLIENT_SECRET || 'lens-backend-secret'
  const publicHost = process.env.KEYCLOAK_PUBLIC_HOST || 'localhost'
  const internalBase = process.env.KEYCLOAK_INTERNAL_BASE || 'http://keycloak:8080'

  const issuerPublic = `http://${publicHost}:${keycloakPort}/realms/${realm}`
  const authorizeUrl = `${issuerPublic}/protocol/openid-connect/auth`
  const internalConnect = `${internalBase.replace(/\/+$/, '')}/realms/${realm}/protocol/openid-connect`
  const tokenUrl = `${internalConnect}/token`
  const userinfoUrl = `${internalConnect}/userinfo`
  const redirectUri = `http://${publicHost}:${backendPort}/oauth/oidc/callback`

  const oidc = {
    enabled: true,
    clientId,
    clientSecret,
    redirectUri,
    issuer: issuerPublic,
    authorizeUrl,
    tokenUrl,
    userinfoUrl,
    signInWithName: '',
  }

  console.log('>>> seed dev keycloak oidc site-config')

  const db = await app.get('mongodbClient')
  const collection = db.collection('site-config')
  const id = new ObjectId(siteConfigId)

  const doc = await collection.findOne({ _id: id })
  if (!doc) {
    console.log('>>> site config does not exist, skipping')
    return
  }

  const existingIssuer = typeof doc.oauth?.providers?.oidc?.issuer === 'string' ? doc.oauth.providers.oidc.issuer.trim() : ''
  if (existingIssuer) {
    console.log('>>> skipping: oauth.providers.oidc.issuer already set')
    return
  }

  await collection.updateOne(
    { _id: id },
    {
      $set: {
        'oauth.providers.oidc': oidc,
        updatedAt: Date.now(),
      },
    }
  )

  console.log('>>> oauth.providers.oidc updated')

  const updateOAuthConfig = app.get('updateOAuthConfig')
  if (typeof updateOAuthConfig === 'function') {
    try {
      const full = await collection.findOne({ _id: id })
      await updateOAuthConfig(full)
      console.log('>>> oauth grant config reloaded')
    } catch (e) {
      console.log('>>> oauth reload failed:', e.message)
    }
  }
}
