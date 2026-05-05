// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ObjectId } from 'mongodb'
import { siteConfigId } from '../services/site-config/site-config.schema.js'

const defaultOidcProvider = {
  enabled: false,
  clientId: '',
  clientSecret: '',
  redirectUri: '',
  issuer: '',
  authorizeUrl: '',
  tokenUrl: '',
  userinfoUrl: '',
  signInWithName: '',
}

export async function addOidcProviderToSiteConfigCommand(app) {
  console.log('>>> checking for site config (add oidc provider)')
  const db = await app.get('mongodbClient')
  const collection = db.collection('site-config')

  const existingConfig = await collection.findOne({ _id: new ObjectId(siteConfigId) })

  if (!existingConfig) {
    console.log('>>> site config does not exist, skipping migration')
    return
  }

  if (!existingConfig.oauth?.providers) {
    console.log('>>> site config has no oauth.providers, skipping migration')
    return
  }

  if (existingConfig.oauth.providers.oidc) {
    console.log('>>> site config already has oauth.providers.oidc, skipping migration')
    return
  }

  console.log('>>> adding oauth.providers.oidc to site config')

  await collection.updateOne(
    { _id: new ObjectId(siteConfigId) },
    {
      $set: {
        'oauth.providers.oidc': { ...defaultOidcProvider },
      },
    }
  )

  console.log('>>> oauth.providers.oidc added to site config')
}
