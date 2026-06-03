// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const PLACEHOLDER_RE = /<(objLabel|selectedObject):([^<>\n]+)>/g;

// Converts a JS string to a Python single-quoted string literal with escaping
const pyStr = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

export const resolvePlaceholders = (source, { viewer } = {}) => {
  return source.replace(PLACEHOLDER_RE, (_match, kind, raw) => {
    const value = raw.trim();
    if (kind === 'objLabel') {
      return `doc.getObjectsByLabel(${pyStr(value)})[0]`;
    }
    if (kind === 'selectedObject') {
      const idx = parseInt(value, 10);
      const sel = viewer?.selectedObjs?.[idx - 1];
      const label = sel?.GetLabel?.();
      if (!label) return 'None';
      return `doc.getObjectsByLabel(${pyStr(label)})[0]`;
    }
    return _match;
  });
};
