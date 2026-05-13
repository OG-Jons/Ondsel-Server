// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { authenticate } from '@feathersjs/authentication'
import { softDelete } from 'feathers-hooks-common'
import swagger from 'feathers-swagger';

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  macrosSchema,
  macrosDataSchema,
  macrosPatchSchema,
  macrosQuerySchema,
  macrosDataValidator,
  macrosPatchValidator,
  macrosQueryValidator,
  macrosResolver,
  macrosExternalResolver,
  macrosDataResolver,
  macrosPatchResolver,
  macrosQueryResolver
} from './macros.schema.js'
import { MacrosService, getOptions } from './macros.class.js'
import { macrosPath, macrosMethods } from './macros.shared.js'
import {
  userBelongingMacros,
  doesUserHaveOrgAdminRights,
  setIsGlobalFromOrgType,
  verifyNameUniquenessInOrg,
} from './helpers.js'

export * from './macros.class.js'
export * from './macros.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const macros = (app) => {
  // Register our service on the Feathers application
  app.use(macrosPath, new MacrosService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: macrosMethods,
    // You can add additional custom events to be sent to clients here
    events: [],
    docs: swagger.createSwaggerServiceOptions({
      schemas: { macrosSchema, macrosDataSchema, macrosPatchSchema, macrosQuerySchema, },
      docs: {
        description: 'A macros service for stored Python scripts',
        idType: 'string',
        securities: ['all'],
      }
    })
  })
  app.service(macrosPath).publish((data, context) => {
    if (data.isGlobal) {
      return app.channel('authenticated')
    }
    return app.channel(`organization/${data.organizationId.toString()}`)
  })
  // Initialize hooks
  app.service(macrosPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(macrosExternalResolver),
        schemaHooks.resolveResult(macrosResolver)
      ]
    },
    before: {
      all: [
        softDelete(),
        schemaHooks.validateQuery(macrosQueryValidator),
        schemaHooks.resolveQuery(macrosQueryResolver)
      ],
      find: [userBelongingMacros],
      get: [userBelongingMacros],
      create: [
        schemaHooks.validateData(macrosDataValidator),
        doesUserHaveOrgAdminRights,
        verifyNameUniquenessInOrg,
        setIsGlobalFromOrgType,
        schemaHooks.resolveData(macrosDataResolver)
      ],
      patch: [
        doesUserHaveOrgAdminRights,
        verifyNameUniquenessInOrg,
        schemaHooks.validateData(macrosPatchValidator),
        schemaHooks.resolveData(macrosPatchResolver)
      ],
      remove: []
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}
