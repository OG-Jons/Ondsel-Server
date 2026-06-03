// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema, StringEnum } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'

const MAX_CODE_BYTES = 100 * 1024
const MAX_OUTPUT_BYTES = 1024 * 1024

// Main data model schema
export const codeRunsSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    userId: ObjectIdSchema(),
    modelId: ObjectIdSchema(),
    sharedModelId: Type.Optional(ObjectIdSchema()),
    macroId: Type.Optional(ObjectIdSchema()),
    macroName: Type.Optional(Type.String({ maxLength: 255 })),
    code: Type.String({ maxLength: MAX_CODE_BYTES }),
    resolvedCode: Type.String({ maxLength: MAX_CODE_BYTES }),
    status: StringEnum(['queued', 'running', 'success', 'error']),
    exitCode: Type.Optional(Type.Integer()),
    stdout: Type.Optional(Type.String({ maxLength: MAX_OUTPUT_BYTES })),
    stderr: Type.Optional(Type.String({ maxLength: MAX_OUTPUT_BYTES })),
    durationMs: Type.Optional(Type.Integer()),
    error: Type.Optional(Type.String()),
    createdAt: Type.Number(),
    startedAt: Type.Optional(Type.Number()),
    finishedAt: Type.Optional(Type.Number()),
  },
  { $id: 'CodeRuns', additionalProperties: false }
)
export const codeRunsValidator = getValidator(codeRunsSchema, dataValidator)
export const codeRunsResolver = resolve({})

export const codeRunsExternalResolver = resolve({})

// Schema for creating new entries
export const codeRunsDataSchema = Type.Pick(codeRunsSchema, [
  'modelId', 'sharedModelId', 'code', 'resolvedCode', 'macroId'
], {
  $id: 'CodeRunsData'
})
export const codeRunsDataValidator = getValidator(codeRunsDataSchema, dataValidator)
export const codeRunsDataResolver = resolve({
  status: async () => 'queued',
  createdAt: async () => Date.now(),
  userId: async (_value, _data, context) => context.params.user._id,
})

// Schema for updating existing entries
export const codeRunsPatchSchema = Type.Partial(
  Type.Pick(codeRunsSchema, [
    'status', 'exitCode', 'stdout', 'stderr', 'durationMs', 'error', 'startedAt', 'finishedAt'
  ]),
  { $id: 'CodeRunsPatch' }
)
export const codeRunsPatchValidator = getValidator(codeRunsPatchSchema, dataValidator)
export const codeRunsPatchResolver = resolve({})

// Schema for allowed query properties
export const codeRunsQueryProperties = Type.Pick(codeRunsSchema, ['userId', 'modelId', 'sharedModelId', 'createdAt'])
export const codeRunsQuerySchema = Type.Intersect(
  [
    querySyntax(codeRunsQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const codeRunsQueryValidator = getValidator(codeRunsQuerySchema, queryValidator)
export const codeRunsQueryResolver = resolve({})
