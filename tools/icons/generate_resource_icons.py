"""Procedural, high-detail resource icons for PsyOps.

Run from Blender's Python console:

    exec(open('/home/bot/psyops-sv/tools/icons/generate_resource_icons.py').read())
    render_icons(['iron', 'copper'])

Renders 512px WebP images with transparency into static/icons/resources.
The generator uses a dedicated scene so any scene already open in Blender is
left untouched. Every icon is built from beveled geometry with fine surface
detail (noise bump, speckles, panel seams, bolts and small parts).
"""

import math
import os
import random

import bpy
from mathutils import Vector

OUT_DIR = "/home/bot/psyops-sv/static/icons/resources"
SCENE_NAME = "ResourceIcons"

RESOURCES = [
    "iron", "copper", "steel", "gunpowder", "wood", "coal", "oil", "gas",
    "uranium", "rare_earth", "silicon", "fuel", "enriched_uranium",
    "rifles", "ammunition", "artillery", "vehicles", "explosives", "chips",
    "electronics", "hardware", "machine_tools", "fab_equipment",
]


# ---------- scene ----------

def ensure_scene():
    scene = bpy.data.scenes.get(SCENE_NAME)
    if scene is None:
        scene = bpy.data.scenes.new(SCENE_NAME)
    bpy.context.window.scene = scene
    for obj in list(scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 95
    scene.render.filepath = ""
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    if hasattr(scene, "eevee") and hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 96

    world = scene.world or bpy.data.worlds.new("Icon world")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.42, 0.45, 0.5, 1)
        bg.inputs["Strength"].default_value = 0.85

    bpy.ops.object.camera_add(location=(5.4, -7.2, 5.0))
    cam = bpy.context.object
    cam.name = "Icon camera"
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 2.9
    cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    def area(name, loc, energy, size, color):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 0)) - obj.location).to_track_quat("-Z", "Y").to_euler()

    area("Key", (3, -4, 7), 420, 5.0, (1.0, 0.96, 0.9))
    area("Fill", (-5, -2, 3), 160, 4.0, (0.75, 0.84, 1.0))
    area("Rim", (1, 5, 5), 480, 3.0, (1.0, 0.9, 0.75))
    return scene


def clear_icons():
    scene = bpy.data.scenes.get(SCENE_NAME)
    if not scene:
        return
    bpy.context.window.scene = scene
    for obj in list(scene.objects):
        if obj.type in {"CAMERA", "LIGHT"}:
            continue
        bpy.data.objects.remove(obj, do_unlink=True)


# ---------- materials and primitives ----------

def material(name, color, metallic=0.0, roughness=0.45, noise=0.0, speckle=None, emissive=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    if emissive:
        bsdf.inputs["Emission Color"].default_value = (*color, 1)
        bsdf.inputs["Emission Strength"].default_value = emissive
    if noise or speckle:
        tex = nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = 26 if noise else 60
        tex.inputs["Detail"].default_value = 5
        tex.inputs["Roughness"].default_value = 0.7
        if noise:
            bump = nodes.new("ShaderNodeBump")
            bump.inputs["Strength"].default_value = noise
            bump.inputs["Distance"].default_value = 0.035
            links.new(tex.outputs["Fac"], bump.inputs["Height"])
            links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
        if speckle:
            ramp = nodes.new("ShaderNodeValToRGB")
            ramp.color_ramp.elements[0].position = 0.42
            ramp.color_ramp.elements[0].color = (*color, 1)
            ramp.color_ramp.elements[1].position = 0.72
            ramp.color_ramp.elements[1].color = (*speckle, 1)
            links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
            links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def finish(obj, mat, bevel=0.02, smooth=True, facets=False):
    scene = bpy.data.scenes[SCENE_NAME]
    scene.collection.objects.link(obj) if obj.name not in scene.objects else None
    obj.data.materials.append(mat)
    if bevel and obj.type == "MESH":
        mod = obj.modifiers.new("Micro bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.affect = "EDGES"
        mod2 = obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
        mod2.keep_sharp = True
    if obj.type == "MESH":
        for poly in obj.data.polygons:
            poly.use_smooth = smooth and not facets
    return obj


def box(name, loc, dim, mat, bevel=0.025, rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dim
    if rot:
        obj.rotation_euler = rot
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, bevel)


def cyl(name, loc, radius, depth, mat, verts=32, bevel=0.015, rot=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    if rot:
        obj.rotation_euler = rot
    return finish(obj, mat, bevel)


def sphere(name, loc, radius, mat, subdiv=2, noise=0.0, seed=0, facets=False):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    if noise:
        rnd = random.Random(seed)
        phase = rnd.random() * 6.28
        for v in obj.data.vertices:
            x, y, z = v.co
            k = 1 + noise * (
                0.6 * math.sin(3 * x + phase) * math.cos(4 * y) +
                0.4 * math.sin(5 * z + 2 * y) +
                0.25 * math.cos(7 * x - 3 * z)
            )
            v.co *= k
    return finish(obj, mat, bevel=0.006, facets=facets)


def torus(name, loc, major, minor, mat, rot=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc)
    obj = bpy.context.object
    obj.name = name
    if rot:
        obj.rotation_euler = rot
    return finish(obj, mat, 0.008)


def rod_between(name, a, b, radius, mat, verts=16):
    a, b = Vector(a), Vector(b)
    mid = (a + b) / 2
    d = b - a
    obj = cyl(name, mid, radius, d.length, mat, verts=verts, bevel=0.008)
    obj.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return obj


def bolt(name, loc, mat, radius=0.025):
    return cyl(name, loc, radius, radius * 0.8, mat, verts=8, bevel=0.004)


def bolts_on(obj, mat, points):
    for i, p in enumerate(points):
        bolt(f"{obj.name} bolt {i}", p, mat)


# ---------- reusable detailed pieces ----------

def ore_pile(name, colors, seed=1, count=11):
    rnd = random.Random(seed)
    mats = [material(f"{name} ore {i}", c, metallic=0.55 if i == 0 else 0.2,
                     roughness=0.38, noise=0.9,
                     speckle=tuple(min(1, v + 0.07) for v in c)) for i, c in enumerate(colors)]
    for i in range(count):
        r = rnd.uniform(0.22, 0.44)
        pos = (rnd.uniform(-0.62, 0.62), rnd.uniform(-0.52, 0.52), rnd.uniform(0.08, 0.32))
        sphere(f"{name} chunk {i}", pos, r, mats[i % len(mats)], subdiv=2,
               noise=0.42, seed=seed * 17 + i, facets=True)


def ingot_stack(name, color, count=4, metallic=0.85):
    mat = material(f"{name} metal", color, metallic=metallic, roughness=0.28, noise=0.18)
    edge = material(f"{name} edge", tuple(min(1, c + 0.15) for c in color), metallic=0.9, roughness=0.2)
    for i in range(count):
        x = (i % 2) * 0.28 - 0.14
        z = 0.14 + (i // 2) * 0.22
        box(f"{name} ingot {i}", (x, 0, z), (0.82, 0.42, 0.19), mat, bevel=0.035)
        box(f"{name} ingot lip {i}", (x, 0.19, z + 0.02), (0.76, 0.03, 0.12), edge, bevel=0.01)


def barrel(name, body_color, band_color, cap_mat=None):
    body = material(f"{name} body", body_color, metallic=0.35, roughness=0.5, noise=0.3)
    band = material(f"{name} band", band_color, metallic=0.8, roughness=0.32)
    cyl(f"{name} drum", (0, 0, 0.55), 0.52, 1.05, body, verts=48, bevel=0.04)
    for z in (0.18, 0.55, 0.92):
        torus(f"{name} hoop {z}", (0, 0, z), 0.525, 0.032, band)
    cyl(f"{name} lid", (0, 0, 1.09), 0.5, 0.06, cap_mat or band, verts=48, bevel=0.02)
    for a in range(8):
        ang = a * math.tau / 8
        bolt(f"{name} lid bolt {a}", (0.4 * math.cos(ang), 0.4 * math.sin(ang), 1.13), band)


def crate(name, color, trim):
    wood = material(f"{name} wood", color, roughness=0.72, noise=0.65, speckle=trim)
    frame = material(f"{name} frame", trim, roughness=0.6, noise=0.3)
    box(f"{name} body", (0, 0, 0.35), (1.25, 0.85, 0.7), wood, bevel=0.03)
    for x in (-0.52, 0.52):
        box(f"{name} rail x {x}", (x, 0, 0.35), (0.09, 0.88, 0.74), frame, bevel=0.012)
    for y in (-0.34, 0.34):
        box(f"{name} rail y {y}", (0, y, 0.35), (1.27, 0.08, 0.74), frame, bevel=0.012)


def log_stack(name):
    bark = material(f"{name} bark", (0.24, 0.14, 0.08), roughness=0.85, noise=0.9, speckle=(0.36, 0.23, 0.13))
    heart = material(f"{name} heart", (0.64, 0.44, 0.24), roughness=0.7, noise=0.5)
    ring = material(f"{name} ring", (0.42, 0.27, 0.14), roughness=0.75)
    for i, (y, z) in enumerate([(-0.22, 0.22), (0.22, 0.22), (0, 0.58)]):
        obj = cyl(f"{name} log {i}", (0, y, z), 0.21, 1.5, bark, verts=32, bevel=0.02,
                  rot=(0, math.pi / 2, 0))
        cyl(f"{name} cut {i}", (0.76, y, z), 0.2, 0.012, heart, verts=32, bevel=0.004,
            rot=(0, math.pi / 2, 0))
        torus(f"{name} growth ring {i}", (0.772, y, z), 0.11, 0.012, ring, rot=(0, math.pi / 2, 0))


def rifle_mesh(name, loc, rot, metal, stock):
    root = bpy.data.objects.new(f"{name} root", None)
    bpy.data.scenes[SCENE_NAME].collection.objects.link(root)
    root.location = loc
    root.rotation_euler = rot

    def part(obj):
        obj.parent = root
        return obj

    part(box(f"{name} stock", (-0.42, 0, 0.02), (0.62, 0.14, 0.2), stock, bevel=0.03))
    part(box(f"{name} receiver", (0.02, 0, 0.08), (0.52, 0.2, 0.22), metal, bevel=0.025))
    part(rod_between(f"{name} barrel", (0.26, 0, 0.1), (1.02, 0, 0.1), 0.055, metal))
    part(box(f"{name} magazine", (-0.03, 0, -0.12), (0.18, 0.15, 0.3), metal, bevel=0.015,
             rot=(0.25, 0, 0)))
    part(box(f"{name} grip", (-0.28, 0, -0.12), (0.14, 0.13, 0.28), stock, bevel=0.02,
             rot=(-0.25, 0, 0)))
    part(cyl(f"{name} scope", (0.08, 0, 0.25), 0.06, 0.38, metal, verts=20, bevel=0.01,
             rot=(0, math.pi / 2, 0)))
    part(rod_between(f"{name} sight", (0.72, 0, 0.1), (0.78, 0, 0.24), 0.018, metal))
    part(rod_between(f"{name} trigger", (-0.15, 0, -0.02), (-0.18, 0, -0.16), 0.018, metal))
    return root


def circuit_board(name, chip_colors, with_cpu=True):
    board = material(f"{name} pcb", (0.04, 0.24, 0.16), roughness=0.5, noise=0.25)
    gold = material(f"{name} gold", (0.85, 0.64, 0.18), metallic=0.9, roughness=0.24)
    dark = material(f"{name} chip", (0.06, 0.07, 0.09), roughness=0.38)
    box(f"{name} pcb", (0, 0, 0.12), (1.5, 1.05, 0.08), board, bevel=0.025)
    for i, c in enumerate(chip_colors):
        chip = material(f"{name} chip {i}", c, metallic=0.25, roughness=0.32)
        x = -0.45 + (i % 3) * 0.45
        y = -0.25 + (i // 3) * 0.42
        box(f"{name} ic {i}", (x, y, 0.2), (0.3, 0.22, 0.1), chip, bevel=0.014)
        for p in range(4):
            bolt(f"{name} ic pin {i}-{p}", (x - 0.1 + p * 0.066, y - 0.14, 0.16), gold, 0.012)
    if with_cpu:
        box(f"{name} cpu", (0.15, 0.05, 0.24), (0.44, 0.38, 0.13), dark, bevel=0.03)
        cyl(f"{name} cooler", (0.15, 0.05, 0.36), 0.19, 0.05, dark, verts=32, bevel=0.01)
        for a in range(6):
            ang = a * math.tau / 6
            box(f"{name} heatsink {a}", (0.15 + 0.09 * math.cos(ang), 0.05 + 0.09 * math.sin(ang), 0.4),
                (0.04, 0.18, 0.06), gold, bevel=0.008)
    # Fine copper traces on the board surface.
    for i in range(9):
        y = -0.42 + i * 0.1
        box(f"{name} trace {i}", (-0.1, y, 0.168), (0.7, 0.012, 0.004), gold, bevel=0.002)


# ---------- icon definitions ----------

def icon_iron():
    ore_pile("iron", [(0.045, 0.05, 0.06), (0.09, 0.1, 0.12), (0.025, 0.03, 0.04)], seed=11, count=12)
    metal = material("iron shard", (0.52, 0.54, 0.57), metallic=0.9, roughness=0.25, noise=0.2)
    for i in range(4):
        box(f"iron shard {i}", (-0.4 + i * 0.25, -0.2, 0.55 + i * 0.05),
            (0.22, 0.12, 0.08), metal, bevel=0.01, rot=(0.2 * i, 0.3 * i, 0.1 * i))


def icon_copper():
    ingot_stack("copper", (0.72, 0.36, 0.16), count=4)
    ore_pile("copper ore", [(0.45, 0.22, 0.1), (0.16, 0.42, 0.32), (0.62, 0.38, 0.2)], seed=23, count=5)


def icon_steel():
    ingot_stack("steel", (0.55, 0.6, 0.66), count=6, metallic=0.95)
    dark = material("steel seam", (0.25, 0.29, 0.34), metallic=0.8, roughness=0.3)
    for i in range(6):
        box(f"steel groove {i}", (-0.42 + (i % 3) * 0.4, -0.22, 0.25 + (i // 3) * 0.22),
            (0.03, 0.44, 0.2), dark, bevel=0.005)


def icon_gunpowder():
    sack = material("powder sack", (0.32, 0.29, 0.24), roughness=0.9, noise=0.9, speckle=(0.44, 0.4, 0.33))
    dust = material("powder dust", (0.06, 0.06, 0.07), roughness=1.0, noise=0.4)
    sphere("powder sack body", (0, 0, 0.34), 0.55, sack, subdiv=3, noise=0.12, seed=4)
    cyl("powder sack neck", (0, 0, 0.85), 0.16, 0.28, sack, verts=24, bevel=0.02)
    torus("powder tie", (0, 0, 0.82), 0.17, 0.035, material("powder cord", (0.5, 0.42, 0.3)), )
    for i in range(18):
        a = i * 2.4
        r = 0.1 + (i % 5) * 0.13
        sphere(f"powder grain {i}", (r * math.cos(a), r * math.sin(a), 1.02 + (i % 3) * 0.02),
               0.025, dust, subdiv=1)


def icon_wood():
    log_stack("wood")


def icon_coal():
    ore_pile("coal", [(0.045, 0.048, 0.055), (0.1, 0.105, 0.12), (0.02, 0.022, 0.03)], seed=31, count=11)
    shine = material("coal facet", (0.18, 0.19, 0.21), metallic=0.25, roughness=0.18)
    for i in range(3):
        sphere(f"coal glint {i}", (-0.3 + i * 0.3, 0.1, 0.42 + i * 0.08), 0.05, shine, subdiv=1)


def icon_oil():
    barrel("oil", (0.08, 0.09, 0.11), (0.35, 0.36, 0.38))
    tar = material("oil tar", (0.03, 0.035, 0.05), metallic=0.3, roughness=0.12)
    sphere("oil drop", (0.62, -0.4, 0.18), 0.2, tar, subdiv=3)
    cyl("oil slick", (0.2, -0.55, 0.02), 0.55, 0.02, tar, verts=48, bevel=0.005)


def icon_gas():
    tank = material("gas tank", (0.25, 0.5, 0.72), metallic=0.65, roughness=0.28, noise=0.2)
    steel = material("gas valve", (0.7, 0.74, 0.78), metallic=0.9, roughness=0.22)
    cyl("gas cylinder", (0, 0, 0.42), 0.45, 1.0, tank, verts=48, bevel=0.05)
    sphere("gas shoulder", (0, 0, 0.92), 0.45, tank, subdiv=3)
    cyl("gas valve stem", (0, 0, 1.18), 0.1, 0.18, steel, verts=20, bevel=0.01)
    torus("gas valve wheel", (0, 0, 1.3), 0.18, 0.026, steel, rot=(math.pi / 2, 0, 0))
    for i in range(5):
        sphere(f"gas bubble {i}", (-0.72 + i * 0.26, -0.3 + (i % 2) * 0.2, 0.95 + i * 0.08),
               0.05 + i * 0.008, tank, subdiv=2)


def icon_uranium():
    ore_pile("uranium", [(0.52, 0.56, 0.08), (0.3, 0.38, 0.06), (0.7, 0.72, 0.16)], seed=47, count=8)
    yellow = material("uranium paint", (0.92, 0.82, 0.06), roughness=0.5)
    for i in range(3):
        a = i * math.tau / 3
        p = (0.12 * math.cos(a), 0.12 * math.sin(a), 0.9)
        box(f"uranium blade {i}", p, (0.34, 0.09, 0.02), yellow, bevel=0.006, rot=(0, 0, a))
    cyl("uranium hub", (0, 0, 0.9), 0.09, 0.05, yellow, verts=24, bevel=0.008,
        rot=(math.pi / 2, 0, 0))


def icon_rare_earth():
    ore_pile("rare earth base", [(0.16, 0.17, 0.2), (0.24, 0.2, 0.26)], seed=59, count=5)
    colors = [(0.3, 0.8, 0.72), (0.75, 0.4, 0.85), (0.95, 0.72, 0.25), (0.4, 0.6, 0.95)]
    for i, color in enumerate(colors):
        crystal = material(f"rare crystal {i}", color, metallic=0.2, roughness=0.12,
                           emissive=0.35)
        bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.16, radius2=0.02,
                                        depth=0.6 + i * 0.08,
                                        location=(-0.35 + i * 0.24, -0.1 + (i % 2) * 0.24, 0.5))
        obj = bpy.context.object
        obj.name = f"rare earth crystal {i}"
        obj.rotation_euler = (0.15 * (i - 1), 0.1 * i, 0)
        finish(obj, crystal, 0.008, facets=True)


def icon_silicon():
    wafer = material("silicon wafer", (0.42, 0.46, 0.5), metallic=0.85, roughness=0.18, noise=0.12)
    grid = material("silicon grid", (0.16, 0.18, 0.22), metallic=0.7, roughness=0.3)
    cyl("silicon boule", (0, 0, 0.36), 0.52, 0.72, wafer, verts=64, bevel=0.04,
        rot=(math.pi / 2, 0, 0))
    for i in range(-3, 4):
        box(f"silicon seam v {i}", (i * 0.14, 0, 0.36), (0.012, 0.5, 0.5), grid, bevel=0.003)
        box(f"silicon seam h {i}", (0, i * 0.14, 0.36), (0.5, 0.012, 0.5), grid, bevel=0.003)
    cyl("silicon notch", (0, -0.52, 0.36), 0.09, 0.03, grid, verts=16, bevel=0.004,
        rot=(math.pi / 2, 0, 0))


def icon_fuel():
    can = material("fuel can", (0.16, 0.29, 0.13), metallic=0.5, roughness=0.42, noise=0.3)
    cap = material("fuel cap", (0.62, 0.64, 0.6), metallic=0.9, roughness=0.25)
    box("fuel jerrycan", (0, 0, 0.42), (0.95, 0.46, 0.82), can, bevel=0.06)
    box("fuel handle", (0.24, 0, 0.87), (0.34, 0.1, 0.12), can, bevel=0.03)
    cyl("fuel cap", (-0.22, 0, 0.88), 0.12, 0.14, cap, verts=24, bevel=0.015)
    for x in (-0.34, 0.34):
        box(f"fuel rib {x}", (x, 0, 0.42), (0.05, 0.48, 0.7), cap, bevel=0.012)
    box("fuel label", (0, -0.235, 0.48), (0.5, 0.01, 0.24),
        material("fuel label", (0.9, 0.82, 0.4), roughness=0.7), bevel=0.008)


def icon_enriched_uranium():
    shell = material("enriched shell", (0.1, 0.12, 0.13), metallic=0.85, roughness=0.3)
    glow = material("enriched rod", (0.35, 1.0, 0.35), metallic=0.2, roughness=0.2, emissive=2.5)
    box("enriched base", (0, 0, 0.14), (1.15, 0.85, 0.22), shell, bevel=0.04)
    for i in range(7):
        x = -0.42 + (i % 4) * 0.28
        y = -0.2 + (i // 4) * 0.36
        cyl(f"enriched rod {i}", (x, y, 0.62), 0.085, 0.86, glow, verts=24, bevel=0.012)
        cyl(f"enriched collar {i}", (x, y, 1.06), 0.1, 0.06, shell, verts=24, bevel=0.01)


def icon_rifles():
    metal = material("rifle metal", (0.22, 0.24, 0.27), metallic=0.85, roughness=0.3)
    stock = material("rifle stock", (0.38, 0.22, 0.11), roughness=0.6, noise=0.5)
    rifle_mesh("rifle a", (0, -0.18, 0.42), (0, 0, 0.28), metal, stock)
    rifle_mesh("rifle b", (0, 0.18, 0.5), (0, 0, -0.28), metal, stock)


def icon_ammunition():
    brass = material("ammo brass", (0.78, 0.56, 0.14), metallic=0.9, roughness=0.24)
    lead = material("ammo lead", (0.3, 0.3, 0.32), metallic=0.7, roughness=0.35)
    crate("ammo", (0.35, 0.24, 0.13), (0.2, 0.14, 0.08))
    for row in range(3):
        for col in range(5):
            x = -0.44 + col * 0.22
            y = -0.2 + row * 0.2
            cyl(f"round {row}-{col}", (x, y, 0.82), 0.055, 0.3, brass, verts=20, bevel=0.01)
            cyl(f"bullet {row}-{col}", (x, y, 1.02), 0.05, 0.11, lead, verts=20, bevel=0.02)


def icon_artillery():
    metal = material("gun metal", (0.22, 0.26, 0.24), metallic=0.8, roughness=0.35, noise=0.3)
    wheel = material("gun wheel", (0.14, 0.12, 0.1), roughness=0.8, noise=0.6)
    box("gun carriage", (0, 0, 0.36), (1.1, 0.42, 0.22), metal, bevel=0.04)
    rod_between("gun barrel", (-0.35, 0, 0.62), (1.05, 0, 0.82), 0.12, metal, verts=32)
    cyl("gun muzzle", (1.06, 0, 0.82), 0.15, 0.12, metal, verts=32, bevel=0.02,
        rot=(0, math.pi / 2, -0.14))
    for x in (-0.5, 0.5):
        cyl(f"gun wheel {x}", (x, -0.35, 0.3), 0.3, 0.12, wheel, verts=32, bevel=0.03,
            rot=(math.pi / 2, 0, 0))
        for s in range(6):
            ang = s * math.tau / 6
            box(f"gun spoke {x}-{s}", (x + 0.16 * math.cos(ang), -0.42, 0.3 + 0.16 * math.sin(ang)),
                (0.03, 0.04, 0.28), metal, bevel=0.006, rot=(0, 0, -ang))


def icon_vehicles():
    body = material("vehicle hull", (0.24, 0.3, 0.2), metallic=0.6, roughness=0.45, noise=0.35)
    dark = material("vehicle track", (0.08, 0.09, 0.09), roughness=0.75, noise=0.4)
    box("vehicle hull", (0, 0, 0.42), (1.35, 0.72, 0.42), body, bevel=0.06)
    box("vehicle turret", (-0.1, 0, 0.76), (0.62, 0.55, 0.28), body, bevel=0.07)
    rod_between("vehicle cannon", (0.1, 0, 0.78), (0.95, 0, 0.82), 0.055,
                material("vehicle barrel", (0.2, 0.22, 0.2), metallic=0.8, roughness=0.3))
    for y in (-0.44, 0.44):
        box(f"vehicle track {y}", (0, y, 0.2), (1.42, 0.16, 0.36), dark, bevel=0.08)
        for i in range(6):
            cyl(f"road wheel {y}-{i}", (-0.55 + i * 0.22, y, 0.2), 0.12, 0.1, dark, verts=20,
                bevel=0.01, rot=(math.pi / 2, 0, 0))
    for i in range(4):
        bolt(f"vehicle bolt {i}", (-0.45 + i * 0.3, -0.37, 0.5),
             material("vehicle rivet", (0.6, 0.62, 0.58), metallic=0.9, roughness=0.25))


def icon_explosives():
    red = material("dynamite wrap", (0.68, 0.09, 0.08), roughness=0.72, noise=0.4)
    twine = material("dynamite twine", (0.55, 0.42, 0.22), roughness=0.8)
    fuse = material("dynamite fuse", (0.2, 0.18, 0.14), roughness=0.9)
    for i in range(6):
        x = -0.42 + (i % 3) * 0.42
        y = -0.22 + (i // 3) * 0.42
        cyl(f"dynamite {i}", (x, y, 0.29), 0.16, 0.58, red, verts=24, bevel=0.04)
        cyl(f"dynamite cap {i}", (x, y, 0.6), 0.1, 0.07, twine, verts=20, bevel=0.01)
    box("dynamite band x", (0, 0, 0.32), (1.05, 0.05, 0.6), twine, bevel=0.01)
    box("dynamite band y", (0, 0, 0.32), (0.05, 0.88, 0.6), twine, bevel=0.01)
    rod_between("dynamite fuse", (0.2, 0.2, 0.65), (0.55, 0.45, 1.0), 0.022, fuse)
    sphere("dynamite spark", (0.56, 0.46, 1.02), 0.07,
           material("dynamite spark", (1.0, 0.65, 0.1), emissive=3), subdiv=2)


def icon_chips():
    circuit_board("chips", [(0.1, 0.12, 0.16), (0.12, 0.16, 0.22), (0.09, 0.11, 0.14)], with_cpu=True)
    for i in range(12):
        a = i * math.tau / 12
        bolt(f"chip pin {i}", (0.75 * math.cos(a), 0.5 * math.sin(a), 0.18),
             material("chip leg", (0.85, 0.7, 0.3), metallic=0.9, roughness=0.25), 0.018)


def icon_electronics():
    circuit_board("electronics", [(0.12, 0.14, 0.18), (0.22, 0.12, 0.1), (0.1, 0.2, 0.16)], with_cpu=False)
    cap = material("electronics capacitor", (0.32, 0.36, 0.42), metallic=0.5, roughness=0.35)
    for i in range(6):
        x = -0.55 + i * 0.22
        cyl(f"electronics cap {i}", (x, 0.36, 0.28), 0.075, 0.24, cap, verts=20, bevel=0.015)
    for i in range(4):
        box(f"electronics resistor {i}", (-0.5 + i * 0.3, -0.38, 0.22), (0.16, 0.05, 0.05),
            material("electronics resistor", (0.72, 0.68, 0.55), roughness=0.6), bevel=0.008)


def icon_hardware():
    dark = material("hardware case", (0.1, 0.12, 0.15), metallic=0.75, roughness=0.32)
    accent = material("hardware led", (0.2, 0.9, 0.6), metallic=0.1, roughness=0.2, emissive=2)
    box("hardware server", (0, 0, 0.5), (1.2, 0.86, 0.95), dark, bevel=0.045)
    for i in range(5):
        z = 0.18 + i * 0.17
        box(f"hardware slot {i}", (0, -0.44, z), (1.02, 0.03, 0.1),
            material("hardware slot", (0.18, 0.2, 0.24), metallic=0.8, roughness=0.3), bevel=0.01)
        sphere(f"hardware led {i}", (0.46, -0.47, z), 0.025, accent, subdiv=2)
    for i in range(3):
        cyl(f"hardware fan {i}", (-0.35 + i * 0.35, 0.44, 0.55), 0.13, 0.05, dark, verts=24, bevel=0.01,
            rot=(math.pi / 2, 0, 0))
        for b in range(5):
            a = b * math.tau / 5
            box(f"hardware fan blade {i}-{b}", (-0.35 + i * 0.35 + 0.06 * math.cos(a), 0.47,
                                                0.55 + 0.06 * math.sin(a)), (0.04, 0.02, 0.1),
                dark, bevel=0.004, rot=(0, 0, a))


def icon_machine_tools():
    iron = material("machine iron", (0.28, 0.32, 0.36), metallic=0.82, roughness=0.35, noise=0.3)
    steel = material("machine steel", (0.65, 0.68, 0.7), metallic=0.9, roughness=0.22)
    box("lathe bed", (0, 0, 0.24), (1.5, 0.7, 0.24), iron, bevel=0.04)
    box("lathe head", (-0.52, 0, 0.55), (0.42, 0.62, 0.55), iron, bevel=0.05)
    cyl("lathe chuck", (-0.22, 0, 0.62), 0.2, 0.16, steel, verts=32, bevel=0.02,
        rot=(0, math.pi / 2, 0))
    rod_between("lathe spindle", (-0.25, 0, 0.62), (0.65, 0, 0.62), 0.07, steel)
    for i in range(3):
        cyl(f"lathe gear {i}", (0.5 + i * 0.2, -0.38, 0.42), 0.14 - i * 0.02, 0.06, steel,
            verts=18, bevel=0.01, rot=(math.pi / 2, 0, 0))
    box("lathe panel", (-0.52, -0.36, 0.58), (0.28, 0.04, 0.22),
        material("lathe panel", (0.12, 0.14, 0.16), roughness=0.5), bevel=0.01)


def icon_fab_equipment():
    shell = material("fab shell", (0.78, 0.8, 0.82), metallic=0.55, roughness=0.3)
    dark = material("fab dark", (0.12, 0.14, 0.18), metallic=0.7, roughness=0.28)
    glow = material("fab light", (0.4, 0.8, 1.0), emissive=2.2)
    box("fab base", (0, 0, 0.18), (1.5, 1.0, 0.3), shell, bevel=0.05)
    box("fab chamber", (0, 0.1, 0.62), (0.85, 0.6, 0.65), dark, bevel=0.06)
    box("fab window", (0, -0.22, 0.66), (0.55, 0.03, 0.38), glow, bevel=0.02)
    rod_between("fab arm base", (0.55, 0.1, 0.5), (0.9, 0.1, 1.0), 0.07, shell)
    rod_between("fab arm tip", (0.9, 0.1, 1.0), (0.35, -0.1, 0.95), 0.05, shell)
    cyl("fab tool", (0.35, -0.1, 0.88), 0.08, 0.2, dark, verts=20, bevel=0.01)
    for i in range(4):
        bolt(f"fab bolt {i}", (-0.6 + i * 0.4, -0.48, 0.24), dark, 0.03)


ICONS = {
    "iron": icon_iron,
    "copper": icon_copper,
    "steel": icon_steel,
    "gunpowder": icon_gunpowder,
    "wood": icon_wood,
    "coal": icon_coal,
    "oil": icon_oil,
    "gas": icon_gas,
    "uranium": icon_uranium,
    "rare_earth": icon_rare_earth,
    "silicon": icon_silicon,
    "fuel": icon_fuel,
    "enriched_uranium": icon_enriched_uranium,
    "rifles": icon_rifles,
    "ammunition": icon_ammunition,
    "artillery": icon_artillery,
    "vehicles": icon_vehicles,
    "explosives": icon_explosives,
    "chips": icon_chips,
    "electronics": icon_electronics,
    "hardware": icon_hardware,
    "machine_tools": icon_machine_tools,
    "fab_equipment": icon_fab_equipment,
}


def render_icons(names=None):
    names = names or RESOURCES
    scene = ensure_scene()
    os.makedirs(OUT_DIR, exist_ok=True)
    done = []
    for name in names:
        builder = ICONS.get(name)
        if builder is None:
            continue
        clear_icons()
        builder()
        scene.render.filepath = os.path.join(OUT_DIR, name + ".webp")
        bpy.ops.render.render(write_still=True)
        done.append(name)
    result = {"rendered": done, "output": OUT_DIR, "size": "512x512 WebP"}
    return result
