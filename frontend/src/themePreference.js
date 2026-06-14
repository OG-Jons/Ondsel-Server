// SPDX-FileCopyrightText: 2026 Ondsel <development@ondsel.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const STORAGE_KEY = 'lensThemePreference'

export function getThemePreference() {
  if (typeof localStorage === 'undefined') return 'system'
  return localStorage.getItem(STORAGE_KEY) || 'system'
}

export function setThemePreference(pref) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, pref)
  }
  // TODO(theme-prefs-sync): once preferences.config.js is split (see
  // ARCHITECTURE_REVIEW.md), also persist the preference to the user's
  // `preferences.theme` field so the choice follows them across devices.
}

export function resolveActiveTheme(pref) {
  if (pref === 'light' || pref === 'dark') return pref
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }
  return 'light'
}

export function watchSystemTheme(callback) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e) => callback(e.matches ? 'dark' : 'light')
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
