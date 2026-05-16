// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export const codeRunsPath = 'code-runs'

export const codeRunsMethods = ['find', 'get', 'create', 'patch']

export const codeRunsClient = (client) => {
  const connection = client.get('connection')

  client.use(codeRunsPath, connection.service(codeRunsPath), {
    methods: codeRunsMethods
  })
}
