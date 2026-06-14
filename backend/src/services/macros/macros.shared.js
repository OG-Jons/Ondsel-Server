// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export const macrosPath = 'macros'

export const macrosMethods = ['find', 'get', 'create', 'patch', 'remove']

export const macrosClient = (client) => {
  const connection = client.get('connection')

  client.use(macrosPath, connection.service(macrosPath), {
    methods: macrosMethods
  })
}
