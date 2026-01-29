// SPDX-FileCopyrightText: 2025 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ObjectId } from 'mongodb';
import { siteConfigId } from '../services/site-config/site-config.schema.js';

export async function addOauthToSiteConfigCommand(app) {
  console.log(">>> checking for site config");
  const db = await app.get('mongodbClient');
  const collection = db.collection('site-config');

  const existingConfig = await collection.findOne({ _id: new ObjectId(siteConfigId) });

  if (!existingConfig) {
    console.log(">>> site config does not exist, skipping migration");
    console.log(">>> Please run createDefaultSiteConfigCommand migration first");
    return;
  }

  // Check if oauth field already exists
  if (existingConfig.oauth) {
    console.log(">>> site config already has oauth field, skipping migration");
    return;
  }

  console.log(">>> adding oauth configuration to site config");
  
  const oauthConfig = {
    providers: {
      google: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        redirectUri: '',
      },
      github: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        redirectUri: '',
      },
    }
  };

  const updateData = {
    $set: {
      oauth: oauthConfig,
    }
  };

  // Add oauth to customized field
  if (existingConfig.customized) {
    // If customized exists, add oauth flag to it
    updateData.$set['customized.oauth'] = false;
  } else {
    // If customized doesn't exist, create it with oauth flag
    updateData.$set.customized = {
      oauth: false,
    };
  }

  await collection.updateOne(
    { _id: new ObjectId(siteConfigId) },
    updateData
  );

  console.log(">>> oauth configuration added to site config");
}
