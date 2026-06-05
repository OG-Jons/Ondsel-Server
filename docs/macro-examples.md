<!--
SPDX-FileCopyrightText: 2026 Amritpal Singh <amrit3701@gmail.com>

SPDX-License-Identifier: AGPL-3.0-or-later
-->

# Macro Examples

Use this guide to understand and run Python macros from the Lens UI.

## Where to use macros

- Open any model in the viewer.
- Open the **Run Script** panel.
- Use **Load a saved macro** to run a saved macro, or type your own script.
- Manage your saved macros on the **Macros** page at `/macros`.

## Placeholder syntax

Lens supports two placeholders that are resolved before script execution:

- `<selectedObject:N>`: the `N`th selected object (1-based)
- `<objLabel:NAME>`: object with label `NAME`

### Notes

- `<selectedObject:N>` is best for reusable macros across many models.
- `<objLabel:NAME>` is useful when a model has stable, known labels.
- If a placeholder has no matching object, the script fails.

## Example macros

### 1) Object Geometry Snapshot

```python
obj = <selectedObject:1>
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
print(f"Wire count: {len(shape.Wires)}")
```

### 2) Compare Two Objects

```python
a = <selectedObject:1>
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
print(f"\\nCenter-of-mass distance (mm): {dist:.3f}")
```

### 3) Document Summary (No selection required)

```python
import Part

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
    print("Net volume (mm^3): n/a (no solids)")
```

### 4) Object Report by Label (`<objLabel:NAME>`)

```python
obj = <objLabel:Body>
shape = obj.Shape
bb = shape.BoundBox

print("=== Label-Based Object Report ===")
print(f"Label: {obj.Label}")
print(f"Type: {obj.TypeId}")
print(f"Volume (mm^3): {shape.Volume:.3f}")
print(f"Area (mm^2): {shape.Area:.3f}")
print(f"BBox (mm): {bb.XLength:.2f} x {bb.YLength:.2f} x {bb.ZLength:.2f}")
print(f"Center of mass: {shape.CenterOfMass}")
```

Use this pattern when your model has stable labels (for example `Body`, `Housing`, `Bracket_A`).
