// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { BadRequest } from '@feathersjs/errors';
import { isUserOwnerOrAdminOfOrg } from '../organizations/helpers.js';
import { OrganizationTypeMap } from '../organizations/organizations.subdocs.schema.js';


export const userBelongingMacros = async context => {
  // used 'before' find/get/patch; visible = user's orgs OR isGlobal
  const myOrgIds = (context.params.user.organizations || []).map(o => o._id);
  context.params.query = {
    ...context.params.query,
    $or: [
      { organizationId: { $in: myOrgIds } },
      { isGlobal: true },
    ],
  };
  return context;
}


export const doesUserHaveOrgAdminRights = async context => {
  // used 'before' create/patch/remove; org from data (create) or existing row (patch/remove)
  let orgId;
  if (context.method === 'create') {
    orgId = context.data.organizationId;
  } else {
    const existing = await context.service.get(context.id, { user: context.params.user });
    orgId = existing.organizationId;
  }
  const org = await context.app.service('organizations').get(orgId, {
    user: context.params.user,
  });
  if (isUserOwnerOrAdminOfOrg(org, context.params.user)) {
    return context;
  }
  throw new BadRequest('You must be an admin of the target organization to manage its macros', { type: 'PermissionError' });
}


export const setIsGlobalFromOrgType = async context => {
  // used 'before' a 'create'; denormalized so visibility queries stay one round-trip
  const org = await context.app.service('organizations').get(context.data.organizationId, {
    user: context.params.user,
  });
  context.data.isGlobal = org.type === OrganizationTypeMap.admin;
  return context;
}


export const verifyNameUniquenessInOrg = async context => {
  // used 'before' a 'create' or 'patch'
  const newName = context.data?.name;
  if (!newName) return context;
  const orgId = context.method === 'create'
    ? context.data.organizationId
    : (await context.service.get(context.id, { user: context.params.user })).organizationId;
  const existing = await context.service.find({
    query: {
      organizationId: orgId,
      name: newName,
      $limit: 2,
    },
    paginate: false,
    user: context.params.user,
  });
  const conflict = existing.find(s => !context.id || s._id.toString() !== context.id.toString());
  if (conflict) {
    throw new BadRequest(`A macro named "${newName}" already exists in this organization`, { type: 'DuplicateName' });
  }
  return context;
}
