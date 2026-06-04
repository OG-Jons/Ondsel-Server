// SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { OrganizationTypeMap } from '../services/organizations/organizations.subdocs.schema.js';

const SAMPLE_GLOBAL_MACROS = [
  {
    name: 'Object Geometry Snapshot',
    description: 'Count vertices/edges/faces/solids for the selected object and print shape diagnostics',
    code: `obj = <selectedObject:1>
shape = obj.Shape
base = obj.Placement.Base

print("=== Geometry Complexity ===")
print(f"Object: {obj.Label}")
print(f"Type: {obj.TypeId}")
print(f"Position (mm): X={base.x:.3f}, Y={base.y:.3f}, Z={base.z:.3f}")
print(f"Valid shape: {shape.isValid()}")
print(f"Vertices: {len(shape.Vertexes)}")
print(f"Edges: {len(shape.Edges)}")
print(f"Faces: {len(shape.Faces)}")
print(f"Solids: {len(shape.Solids)}")
print(f"Shells: {len(shape.Shells)}")
print(f"Wire count: {len(shape.Wires)}")`,
  },
  {
    name: 'Compare Two Objects',
    description: 'Compare two selected objects by volume, area, and center distance',
    code: `a = <selectedObject:1>
b = <selectedObject:2>
sa = a.Shape
sb = b.Shape

vol_a = sa.Volume
vol_b = sb.Volume
area_a = sa.Area
area_b = sb.Area
faces_a = len(sa.Faces)
faces_b = len(sb.Faces)

def pct_delta(a_value, b_value):
    if b_value == 0:
        return None
    return ((a_value - b_value) / b_value) * 100.0

print("=== Two-Object Comparison ===")
print(f"A: {a.Label}")
print(f"  Volume: {vol_a:.3f}")
print(f"  Area: {area_a:.3f}")
print(f"  Faces: {faces_a}")

print(f"B: {b.Label}")
print(f"  Volume: {vol_b:.3f}")
print(f"  Area: {area_b:.3f}")
print(f"  Faces: {faces_b}")

print("\\nDeltas (A - B):")
print(f"  ΔVolume: {(vol_a - vol_b):.3f}")
print(f"  ΔArea: {(area_a - area_b):.3f}")
print(f"  ΔFaces: {faces_a - faces_b}")

vol_pct = pct_delta(vol_a, vol_b)
area_pct = pct_delta(area_a, area_b)
print(f"  %ΔVolume vs B: {f'{vol_pct:.3f}%' if vol_pct is not None else 'undefined (B is 0)'}")
print(f"  %ΔArea vs B: {f'{area_pct:.3f}%' if area_pct is not None else 'undefined (B is 0)'}")

dist = (sa.CenterOfMass.sub(sb.CenterOfMass)).Length
print(f"\\nCenter-of-mass distance (mm): {dist:.3f}")`,
  },
  {
    name: 'Document Summary',
    description: 'Summarize object counts, type breakdown, and solids in the current document',
    code: `import Part

objects = list(doc.Objects)

print("=== Document Summary ===")
print(f"Total objects: {len(objects)}")

type_counts = {}
solid_object_count = 0
solid_entity_count = 0
solids = []

for obj in objects:
    type_id = getattr(obj, "TypeId", "Unknown")
    type_counts[type_id] = type_counts.get(type_id, 0) + 1

    if hasattr(obj, "Shape"):
        shape = obj.Shape
        object_solids = list(shape.Solids)
        if object_solids:
            solid_object_count += 1
            solid_entity_count += len(object_solids)
            solids.extend(object_solids)

print("\\nType breakdown:")
for type_id in sorted(type_counts.keys()):
    print(f"  {type_id}: {type_counts[type_id]}")

print("\\nSolid objects:", solid_object_count)
print("Solid entities:", solid_entity_count)

if len(solids) >= 2:
    try:
        fused = solids[0].multiFuse(solids[1:])
        if hasattr(fused, "removeSplitter"):
            fused = fused.removeSplitter()
        print(f"Net volume (mm^3): {fused.Volume:.3f}")
    except Part.OCCError as err:
        print(f"Net volume could not be computed (OCC error): {err}")
    except Exception as err:
        print(f"Net volume could not be computed: {err}")
elif len(solids) == 1:
    print(f"Net volume (mm^3): {solids[0].Volume:.3f}")
else:
    print("Net volume (mm^3): n/a (no solids)")`,
  },
];

export async function seedGlobalMacrosCommand(app) {
  const userService = app.service('users');
  const organizationService = app.service('organizations');
  const macrosService = app.service('macros');

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@local.test';
  console.log(`>>> Resolving admin user (${adminEmail})`);
  const users = await userService.find({ query: { email: adminEmail } });
  if (!users.total) {
    console.log('>>> Admin user not found. Skipping global macros seeding.');
    return;
  }
  const adminUser = users.data[0];

  let adminOrgId = adminUser.organizations?.find(o => o.type === OrganizationTypeMap.admin)?._id;
  if (!adminOrgId) {
    console.log('>>> Admin organization not found on user summary, looking up by organization type.');
    const adminOrgs = await organizationService.find({
      query: { type: OrganizationTypeMap.admin, $limit: 1 },
    });
    if (!adminOrgs.total) {
      console.log('>>> No organization with type "Admin" found. Skipping global macros seeding.');
      return;
    }
    adminOrgId = adminOrgs.data[0]._id;
  }

  console.log(`>>> Seeding sample global macros into Admin organization (${adminOrgId.toString()})`);
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const sample of SAMPLE_GLOBAL_MACROS) {
    const existing = await macrosService.find({
      query: {
        organizationId: adminOrgId,
        name: sample.name,
        $limit: 1,
      },
      paginate: false,
      user: adminUser,
    });

    if (!existing.length) {
      await macrosService.create(
        {
          name: sample.name,
          description: sample.description,
          code: sample.code,
          organizationId: adminOrgId,
        },
        { user: adminUser },
      );
      created += 1;
      console.log(`>>> Created global macro: ${sample.name}`);
      continue;
    }

    const current = existing[0];
    const hasChanges = current.description !== sample.description || current.code !== sample.code || current.isGlobal !== true;
    if (!hasChanges) {
      unchanged += 1;
      console.log(`>>> Unchanged global macro: ${sample.name}`);
      continue;
    }

    await macrosService.patch(
      current._id,
      {
        description: sample.description,
        code: sample.code,
      },
      { user: adminUser },
    );
    updated += 1;
    console.log(`>>> Updated global macro: ${sample.name}`);
  }

  console.log(`>>> Global macro seed complete (created=${created}, updated=${updated}, unchanged=${unchanged})`);
}
