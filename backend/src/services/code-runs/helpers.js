// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { BadRequest } from '@feathersjs/errors';


export const userBelongingCodeRuns = async context => {
  // Restrict find/get/patch to rows owned by the calling user.
  context.params.query = {
    ...context.params.query,
    userId: context.params.user._id,
  };
  return context;
}


export const doesUserHaveModelWriteRights = async context => {
  // used 'before' a 'create'; running a script is a write-equivalent action,
  // so require workspace.haveWriteAccess.
  const { file, uniqueFileName } = await context.app.service('models').get(
    context.data.modelId,
    {
      user: context.params.user,
      query: { $select: ['uniqueFileName', 'file'] },
    }
  );
  const workspace = await context.app.service('workspaces').get(
    file.workspace._id,
    {
      user: context.params.user,
    }
  );
  if (workspace.haveWriteAccess) {
    context.params._modelFileName = uniqueFileName;
    return context;
  }
  throw new BadRequest('You dont have write access to this model', { type: 'PermissionError' });
}


export const verifyMacroReadable = async context => {
  // used 'before' a 'create'; if macroId is provided, confirm the caller can
  // see that macro (macros.get throws NotFound otherwise)
  const macroId = context.data?.macroId;
  if (!macroId) return context;
  await context.app.service('macros').get(macroId, { user: context.params.user });
  return context;
}
