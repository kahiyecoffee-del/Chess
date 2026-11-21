"""Blender scene for FISILTI episode 1: dorm room at 03:00 + dorm corridor (bad ending).

Run: blender -b --python scene_yurt.py -- <shot> <out_dir> [frames]
Shots: tavan, oda, yorgan, ayakucu, koridor
Cycles CPU, no denoiser in this build: grain is part of the look (and is matched in the edit).
"""
import math
import random
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SHOT, OUT = argv[0], argv[1]
FRAMES = int(argv[2]) if len(argv) > 2 else 48
FPS = 12
random.seed(3)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
scn.cycles.samples = 16
scn.cycles.use_denoising = False
scn.cycles.max_bounces = 4
scn.render.resolution_x, scn.render.resolution_y = 640, 360
scn.render.fps = FPS
scn.frame_start, scn.frame_end = 1, FRAMES
scn.render.image_settings.file_format = "PNG"
scn.render.filepath = f"{OUT}/{SHOT}_"
scn.view_settings.view_transform = "Filmic" if "Filmic" in [v.identifier for v in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items] else "Standard"
scn.view_settings.look = "None"
scn.view_settings.exposure = 0.9
world = bpy.data.worlds.new("w"); scn.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.004, 0.005, 0.008, 1)


def mat(name, color, rough=0.8, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


def box(name, loc, size, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    o.data.materials.append(m)
    if bevel:
        mod = o.modifiers.new("b", "BEVEL"); mod.width = bevel; mod.segments = 3
    return o


def blob(name, loc, scale, m, subdiv=2):
    bpy.ops.mesh.primitive_uv_sphere_add(location=loc, segments=24, ring_count=12)
    o = bpy.context.object; o.name = name; o.scale = scale
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o


WALL = mat("wall", (0.20, 0.21, 0.24))
FLOOR = mat("floor", (0.16, 0.10, 0.06), 0.6)
WOOD = mat("wood", (0.10, 0.06, 0.04), 0.5)
SHEET = mat("sheet", (0.55, 0.55, 0.60), 0.9)
QUILT = mat("quilt", (0.42, 0.33, 0.30), 0.95)
CURT = mat("curt", (0.22, 0.08, 0.09), 0.95)
DARK = mat("dark", (0.0, 0.0, 0.0), 1.0)
STREET = mat("street", (0, 0, 0), 1.0, emit=(1.0, 0.45, 0.12), strength=2.5)


def light(kind, loc, energy, color, size=0.3, rot=(0, 0, 0)):
    l = bpy.data.lights.new(kind + str(random.random()), kind)
    l.energy = energy; l.color = color
    if kind == "AREA": l.size = size
    if kind == "SPOT": l.spot_size = math.radians(40); l.spot_blend = 0.6
    o = bpy.data.objects.new(l.name, l); scn.collection.objects.link(o)
    o.location = loc; o.rotation_euler = rot
    return o


def camera(loc, look_at, lens=24):
    c = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(c)
    c.location = loc; c.data.lens = lens
    d = Vector(look_at) - Vector(loc); c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scn.camera = c
    return c


def handheld(cam, amp=0.004, rot_amp=0.003):
    base_l, base_r = cam.location.copy(), cam.rotation_euler.copy()
    for f in range(1, FRAMES + 1):
        t = f / FPS
        cam.location = base_l + Vector((amp * math.sin(t * 1.3), amp * math.sin(t * 0.9 + 1), amp * 0.5 * math.sin(t * 1.7)))
        cam.rotation_euler = (base_r.x + rot_amp * math.sin(t * 0.7), base_r.y, base_r.z + rot_amp * math.sin(t * 0.5 + 2))
        cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)


def spot_at(src, target, energy, deg):
    l = bpy.data.lights.new("spot" + str(random.random()), "SPOT")
    l.energy = energy; l.color = (1.0, 0.45, 0.12); l.spot_size = math.radians(deg); l.spot_blend = 0.35
    l.shadow_soft_size = 0.02
    o = bpy.data.objects.new(l.name, l); scn.collection.objects.link(o)
    o.location = src; o.rotation_euler = (target - src).to_track_quat("-Z", "Y").to_euler()


def stripe(src, target, energy):
    l = bpy.data.lights.new("stripe" + str(random.random()), "AREA")
    l.shape = "RECTANGLE"; l.size = 0.04; l.size_y = 1.4; l.energy = energy; l.color = (1.0, 0.45, 0.12)
    l.spread = math.radians(12)
    o = bpy.data.objects.new(l.name, l); scn.collection.objects.link(o)
    o.location = src; o.rotation_euler = (target - src).to_track_quat("-Z", "Y").to_euler()


def room():
    # room 4.2 (x) by 3.6 (y) by 2.7 (z); Zehra's bed along the -x wall, Elif's along the +x wall, window at +y
    box("floor", (0, 0, -0.05), (4.4, 3.8, 0.1), FLOOR)
    box("ceil", (0, 0, 2.75), (4.4, 3.8, 0.1), WALL)
    box("wall_l", (-2.15, 0, 1.35), (0.1, 3.8, 2.8), WALL)
    box("wall_r", (2.15, 0, 1.35), (0.1, 3.8, 2.8), WALL)
    box("wall_b", (0, -1.85, 1.35), (4.4, 0.1, 2.8), WALL)
    # window wall with a curtain gap
    box("wall_f_l", (-1.2, 1.85, 1.35), (2.0, 0.1, 2.8), WALL)
    box("wall_f_r", (1.25, 1.85, 1.35), (1.9, 0.1, 2.8), WALL)
    box("curtain_l", (-0.35, 1.75, 1.5), (0.6, 0.05, 2.2), CURT)
    box("curtain_r", (0.35, 1.75, 1.5), (0.62, 0.05, 2.2), CURT)
    box("street_gap", (0.0, 1.95, 1.5), (0.06, 0.02, 1.8), STREET)
    light("POINT", (0.3, -0.8, 1.4), 2.5, (0.4, 0.5, 0.8))  # faint moonish fill
    spot_at(Vector((0.0, 1.68, 1.55)), Vector((1.6, 0.0, 0.65)), 420, 13)   # streetlight across Elif's bed
    spot_at(Vector((0.0, 1.68, 1.95)), Vector((-0.4, -0.8, 2.7)), 260, 7)   # streak on the ceiling
    # Elif's bed (+x)
    box("bed2_frame", (1.6, 0.2, 0.22), (0.95, 2.0, 0.44), WOOD, 0.02)
    box("bed2_matt", (1.6, 0.2, 0.52), (0.9, 1.95, 0.18), SHEET, 0.04)
    box("bed2_pillow", (1.6, 0.98, 0.66), (0.6, 0.32, 0.12), SHEET, 0.05)
    # desk + chair silhouettes
    box("desk", (-0.4, 1.45, 0.75), (1.1, 0.55, 0.05), WOOD)
    box("desk_leg", (-0.9, 1.45, 0.37), (0.05, 0.5, 0.74), WOOD)
    box("chair", (-0.35, 1.0, 0.45), (0.45, 0.45, 0.05), WOOD)
    box("chair_back", (-0.35, 0.8, 0.75), (0.45, 0.04, 0.6), WOOD)
    box("wardrobe", (-1.0, -1.5, 1.0), (1.2, 0.6, 2.0), WOOD, 0.01)
    # wall clock
    bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=0.03, location=(2.09, 0.2, 2.0), rotation=(0, math.radians(90), 0))
    bpy.context.object.data.materials.append(SHEET)


def breathing_body(loc, period=4.0, amp=0.045):
    body = blob("body", loc, (0.38, 0.85, 0.16), QUILT)
    quilt = blob("quilt", (loc[0], loc[1], loc[2] + 0.02), (0.47, 0.95, 0.14), QUILT)
    for f in range(1, FRAMES + 1):
        s = math.sin(2 * math.pi * (f / FPS) / period)
        for o, base in ((body, 0.16), (quilt, 0.14)):
            o.scale.z = base + amp * (0.5 + 0.5 * s)
            o.keyframe_insert("scale", frame=f)
    return body, quilt


def zehra_bed():
    box("bed1_frame", (-1.6, 0.2, 0.22), (0.95, 2.0, 0.44), WOOD, 0.02)
    box("bed1_matt", (-1.6, 0.2, 0.52), (0.9, 1.95, 0.18), SHEET, 0.04)
    own = blob("own_quilt", (-1.6, 0.05, 0.66), (0.47, 0.85, 0.1), QUILT)
    return own


def figure(loc, height=1.9):
    # an unclear, too-tall dark shape: elongated blob + head, no features
    b = blob("fig_body", (loc[0], loc[1], loc[2] + height * 0.45), (0.22, 0.16, height * 0.45), DARK)
    h = blob("fig_head", (loc[0], loc[1], loc[2] + height * 0.93), (0.12, 0.12, 0.15), DARK)
    return b, h


if SHOT in ("tavan", "oda", "yorgan", "ayakucu"):
    room()
    own = zehra_bed()
    breathing_body((1.6, 0.15, 0.68))

if SHOT == "tavan":
    cam = camera((-1.6, -0.55, 0.85), (-0.2, 1.2, 2.75), lens=20)
    handheld(cam, 0.003, 0.004)
elif SHOT == "oda":
    cam = camera((-1.55, -0.65, 0.95), (1.5, 0.4, 0.6), lens=22)
    handheld(cam)
elif SHOT == "yorgan":
    cam = camera((-0.6, -0.35, 0.9), (1.55, 0.25, 0.68), lens=45)
    handheld(cam, 0.002, 0.002)
elif SHOT == "ayakucu":
    cam = camera((-1.6, -0.75, 1.2), (-1.05, 1.3, 0.9), lens=24)
    handheld(cam, 0.003, 0.003)
    # mattress dent at the foot sinks over the shot, figure fades in against the street light
    dent = blob("dent", (-1.6, 1.05, 0.66), (0.28, 0.25, 0.01), DARK)
    fb, fh = figure((-0.75, 1.35, 0.0))
    spot_at(Vector((-0.1, 1.7, 1.6)), Vector((-0.9, 1.2, 1.2)), 90, 30)  # rim light from the window gap
    for o in (fb, fh):
        o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
        o.hide_render = False; o.keyframe_insert("hide_render", frame=int(FRAMES * 0.55))
    for f in (1, FRAMES):
        own.location.z = 0.66 - (0.06 if f == FRAMES else 0.0)
        own.keyframe_insert("location", frame=f)
elif SHOT == "koridor":
    box("floor", (0, 6, -0.05), (2.4, 16, 0.1), FLOOR)
    box("ceil", (0, 6, 2.6), (2.4, 16, 0.1), WALL)
    box("wl", (-1.2, 6, 1.3), (0.1, 16, 2.7), WALL)
    box("wr", (1.2, 6, 1.3), (0.1, 16, 2.7), WALL)
    box("end", (0, 13.9, 1.3), (2.4, 0.1, 2.7), WALL)
    for i in range(6):
        y = 1.5 + i * 2.1
        box(f"dl{i}", (-1.14, y, 1.0), (0.05, 0.9, 2.0), WOOD)
        box(f"dr{i}", (1.14, y + 1.0, 1.0), (0.05, 0.9, 2.0), WOOD)
    lights = []
    for i in range(4):
        lights.append(light("AREA", (0, 1.5 + i * 3.3, 2.5), 14, (0.65, 0.85, 0.75), size=0.6, rot=(0, 0, 0)))
    fb, fh = figure((0.0, 12.8, 0.0), 2.1)
    cam = camera((0, -1.0, 1.55), (0, 12, 1.3), lens=28)
    for f in range(1, FRAMES + 1):  # slow push + flicker
        cam.location.y = -1.0 + 1.2 * f / FRAMES
        cam.keyframe_insert("location", frame=f)
        for j, lo in enumerate(lights):
            on = not (j == 3 and (f % 17 in (3, 4, 9) or f > FRAMES * 0.8)) and not (j == 2 and f % 23 in (5, 6))
            lo.data.energy = 14 if on else 0.1
            lo.data.keyframe_insert("energy", frame=f)

bpy.ops.render.render(animation=True)
