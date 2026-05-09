// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { authenticate } from '@feathersjs/authentication'
import { disallow } from 'feathers-hooks-common'
import axios from 'axios'
import swagger from 'feathers-swagger';

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  codeRunsSchema,
  codeRunsDataSchema,
  codeRunsPatchSchema,
  codeRunsQuerySchema,
  codeRunsDataValidator,
  codeRunsPatchValidator,
  codeRunsQueryValidator,
  codeRunsResolver,
  codeRunsExternalResolver,
  codeRunsDataResolver,
  codeRunsPatchResolver,
  codeRunsQueryResolver
} from './code-runs.schema.js'
import { CodeRunsService, getOptions } from './code-runs.class.js'
import { codeRunsPath, codeRunsMethods } from './code-runs.shared.js'
import { userBelongingCodeRuns, doesUserHaveModelWriteRights } from './helpers.js'

export * from './code-runs.class.js'
export * from './code-runs.schema.js'

const RUN_CODE_SNIPPET_CMD = 'RUN_CODE_SNIPPET'

// A configure function that registers the service and its hooks via `app.configure`
export const codeRuns = (app) => {
  // Register our service on the Feathers application
  app.use(codeRunsPath, new CodeRunsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: codeRunsMethods,
    // You can add additional custom events to be sent to clients here
    events: [],
    docs: swagger.createSwaggerServiceOptions({
      schemas: { codeRunsSchema, codeRunsDataSchema, codeRunsPatchSchema, codeRunsQuerySchema, },
      docs: {
        description: 'A code-runs service tracking RUN_CODE_SNIPPET executions',
        idType: 'string',
        securities: ['all'],
      }
    })
  })
  app.service(codeRunsPath).publish((data, context) => {
    return app.channel(data.userId.toString())
  })
  // Initialize hooks
  app.service(codeRunsPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(codeRunsExternalResolver),
        schemaHooks.resolveResult(codeRunsResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(codeRunsQueryValidator),
        schemaHooks.resolveQuery(codeRunsQueryResolver)
      ],
      find: [userBelongingCodeRuns],
      get: [userBelongingCodeRuns],
      create: [
        schemaHooks.validateData(codeRunsDataValidator),
        doesUserHaveModelWriteRights,
        schemaHooks.resolveData(codeRunsDataResolver)
      ],
      patch: [
        userBelongingCodeRuns,
        schemaHooks.validateData(codeRunsPatchValidator),
        schemaHooks.resolveData(codeRunsPatchResolver)
      ],
      remove: [disallow('external')]
    },
    after: {
      all: [],
      create: [dispatchToWorker]
    },
    error: {
      all: []
    }
  })
}

const dispatchToWorker = async (context) => {
  const run = context.result
  const fileName = context.params._modelFileName
  const accessToken = context.params.authentication?.accessToken || context.params.accessToken

  axios({
    method: 'post',
    url: context.app.get('fcWorkerUrl'),
    headers: { 'Content-Type': 'application/json' },
    data: {
      id: run.modelId.toString(),
      executionId: run._id.toString(),
      fileName,
      command: RUN_CODE_SNIPPET_CMD,
      accessToken,
      script: run.code,
    },
  }).catch(async (err) => {
    // recover stuck 'queued' rows when FC-Worker is unreachable; raw error
    // goes to backend logs, user-facing message is sanitized
    console.error('[code-runs] FC-Worker dispatch failed:', err.message)
    try {
      await context.app.service(codeRunsPath).patch(run._id, {
        status: 'error',
        error: 'Script runner is temporarily unavailable. Please try again.',
        finishedAt: Date.now(),
      }, {
        user: context.params.user,
      })
    } catch {}
  })
  return context
}
