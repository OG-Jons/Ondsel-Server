// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve, virtual } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { ObjectIdSchema } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'
import { isUserOwnerOrAdminOfOrg } from '../organizations/helpers.js'

const MAX_CODE_BYTES = 100 * 1024

// Main data model schema
export const macrosSchema = Type.Object(
  {
    _id: ObjectIdSchema(),
    userId: ObjectIdSchema(),
    organizationId: ObjectIdSchema(),
    name: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    code: Type.String({ maxLength: MAX_CODE_BYTES }),
    isGlobal: Type.Boolean(),
    deleted: Type.Optional(Type.Boolean()),
    createdAt: Type.Number(),
    updatedAt: Type.Number(),
  },
  { $id: 'Macros', additionalProperties: false }
)
export const macrosValidator = getValidator(macrosSchema, dataValidator)
export const macrosResolver = resolve({
  // virtual: true iff the requesting user is admin in the macro's organizationId
  canManage: virtual(async (macro, context) => {
    if (!context.params.user) return false;
    try {
      const org = await context.app.service('organizations').get(macro.organizationId);
      return isUserOwnerOrAdminOfOrg(org, context.params.user);
    } catch {
      return false;
    }
  }),
})

export const macrosExternalResolver = resolve({})

// Schema for creating new entries
export const macrosDataSchema = Type.Pick(macrosSchema, [
  'name', 'description', 'code', 'organizationId'
], {
  $id: 'MacrosData'
})
export const macrosDataValidator = getValidator(macrosDataSchema, dataValidator)
export const macrosDataResolver = resolve({
  userId: async (_value, _data, context) => context.params.user._id,
  createdAt: async () => Date.now(),
  updatedAt: async () => Date.now(),
})

// Schema for updating existing entries (includes `deleted` so softDelete works)
export const macrosPatchSchema = Type.Partial(
  Type.Pick(macrosSchema, ['name', 'description', 'code', 'deleted']),
  { $id: 'MacrosPatch' }
)
export const macrosPatchValidator = getValidator(macrosPatchSchema, dataValidator)
export const macrosPatchResolver = resolve({
  updatedAt: async () => Date.now(),
})

// Schema for allowed query properties
export const macrosQueryProperties = Type.Pick(macrosSchema, [
  'organizationId', 'isGlobal', 'name', 'deleted'
])
export const macrosQuerySchema = Type.Intersect(
  [
    querySyntax(macrosQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export const macrosQueryValidator = getValidator(macrosQuerySchema, queryValidator)
export const macrosQueryResolver = resolve({})
