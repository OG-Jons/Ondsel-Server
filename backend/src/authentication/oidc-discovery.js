// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export function normalizeOidcIssuer(issuer) {
  if (!issuer || typeof issuer !== 'string') return ''
  return issuer.trim().replace(/\/+$/, '')
}

export async function fetchOpenIdConfiguration(issuer) {
  const base = normalizeOidcIssuer(issuer)
  if (!base) {
    throw new Error('Issuer is required')
  }
  const discoveryUrl = `${base}/.well-known/openid-configuration`
  const res = await fetch(discoveryUrl, {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) {
    throw new Error(`OIDC discovery request failed: ${res.status}`)
  }
  const doc = await res.json()
  const authorization_endpoint = doc.authorization_endpoint
  const token_endpoint = doc.token_endpoint
  const userinfo_endpoint = doc.userinfo_endpoint
  if (!authorization_endpoint || !token_endpoint || !userinfo_endpoint) {
    throw new Error('OIDC discovery document is missing required endpoints')
  }
  return {
    authorization_endpoint,
    token_endpoint,
    userinfo_endpoint
  }
}
