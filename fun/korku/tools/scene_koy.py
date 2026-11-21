"""Blender scenes for FISILTI episodes 3-4: night road, grandmother's village house (outside and in).

Run: blender -b --python scene_koy.py -- <shot> <out_dir> [frames]
Shots: yol, koy_dis, ev_ic, hatice, esik, tavan_arasi, pencere
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
random.seed(5)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 16
scn.cycles.use_denoising = False; scn.cycles.max_bounces = 4
scn.render.resolution_x, scn.render.resolution_y = 640, 360
scn.render.fps = FPS; scn.frame_start, scn.frame_end = 1, FRAMES
scn.render.image_settings.file_format = "PNG"; scn.render.filepath = f"{OUT}/{SHOT}_"
scn.view_settings.exposure = 0.9
world = bpy.data.worlds.new("w"); scn.world = world; world.use_nodes = True
BG = world.node_tree.nodes["Background"].inputs[0]; BG.default_value = (0.003, 0.004, 0.008, 1)


def mat(name, color, rough=0.8, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    return m


def box(name, loc, size, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    o.data.materials.append(m); return o


def blob(name, loc, scale, m):
    bpy.ops.mesh.primitive_uv_sphere_add(location=loc, segments=20, ring_count=10)
    o = bpy.context.object; o.name = name; o.scale = scale; o.data.materials.append(m)
    bpy.ops.object.shade_smooth(); return o


def cyl(name, loc, r, depth, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=16)
    o = bpy.context.object; o.name = name; o.data.materials.append(m); return o


def light(kind, loc, energy, color, size=0.3, rot=(0, 0, 0)):
    l = bpy.data.lights.new(kind + str(random.random()), kind); l.energy = energy; l.color = color
    if kind == "AREA": l.size = size
    o = bpy.data.objects.new(l.name, l); scn.collection.objects.link(o); o.location = loc; o.rotation_euler = rot
    return o


def spot_at(src, target, energy, deg, color):
    l = bpy.data.lights.new("spot" + str(random.random()), "SPOT"); l.energy = energy; l.color = color
    l.spot_size = math.radians(deg); l.spot_blend = 0.4; l.shadow_soft_size = 0.05
    o = bpy.data.objects.new(l.name, l); scn.collection.objects.link(o)
    o.location = src; o.rotation_euler = (Vector(target) - Vector(src)).to_track_quat("-Z", "Y").to_euler(); return o


def camera(loc, look_at, lens=24):
    c = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(c)
    c.location = loc; c.data.lens = lens
    c.rotation_euler = (Vector(look_at) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); scn.camera = c; return c


def handheld(cam, amp=0.004, rot_amp=0.003, push=(0, 0, 0)):
    bl, br = cam.location.copy(), cam.rotation_euler.copy()
    for f in range(1, FRAMES + 1):
        t = f / FPS; k = f / FRAMES
        cam.location = bl + Vector(push) * k + Vector((amp * math.sin(t * 1.3), amp * math.sin(t * 0.9 + 1), amp * 0.5 * math.sin(t * 1.7)))
        cam.rotation_euler = (br.x + rot_amp * math.sin(t * 0.7), br.y, br.z + rot_amp * math.sin(t * 0.5 + 2))
        cam.keyframe_insert("location", frame=f); cam.keyframe_insert("rotation_euler", frame=f)


def figure(loc, height=1.9, m=None):
    m = m or DARK
    b = blob("fig_body", (loc[0], loc[1], loc[2] + height * 0.45), (0.22, 0.16, height * 0.45), m)
    h = blob("fig_head", (loc[0], loc[1], loc[2] + height * 0.93), (0.12, 0.12, 0.15), m)
    return b, h


def appear(objs, at):
    for o in objs:
        o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
        o.hide_render = False; o.keyframe_insert("hide_render", frame=max(2, int(FRAMES * at)))


DARK = mat("dark", (0, 0, 0), 1.0)
PLASTER = mat("plaster", (0.42, 0.38, 0.32))
WOOD = mat("wood", (0.12, 0.07, 0.04), 0.6)
OLDWOOD = mat("oldwood", (0.08, 0.06, 0.05), 0.9)
KILIM = mat("kilim", (0.30, 0.06, 0.05), 0.95)
CUSHION = mat("cushion", (0.25, 0.20, 0.12), 0.9)
METAL = mat("metal", (0.05, 0.05, 0.05), 0.4)
FIRE = mat("fire", (0, 0, 0), 1.0, emit=(1.0, 0.35, 0.08), strength=12.0)
SALT = mat("salt", (0.9, 0.9, 0.88), 0.6)
GROUND = mat("ground", (0.05, 0.045, 0.04), 1.0)
ROAD = mat("road", (0.03, 0.03, 0.03), 0.7)
PAINT = mat("paint", (0.6, 0.6, 0.55), 0.5)
SCARF = mat("scarf", (0.015, 0.02, 0.016), 0.95)
GLASS = mat("glass", (0.02, 0.03, 0.05), 0.1)
MOON = (0.55, 0.65, 0.9)
WARM = (1.0, 0.45, 0.15)


def interior():
    box("floor", (0, 0, -0.05), (4.6, 4.0, 0.1), OLDWOOD)
    box("ceil", (0, 0, 2.55), (4.6, 4.0, 0.1), OLDWOOD)
    for i in range(9):  # ceiling beams
        box(f"beam{i}", (-2.0 + i * 0.5, 0, 2.47), (0.1, 4.0, 0.08), WOOD)
    box("wl", (-2.3, 0, 1.25), (0.1, 4.0, 2.6), PLASTER)
    box("wr", (2.3, 0, 1.25), (0.1, 4.0, 2.6), PLASTER)
    box("wb", (0, -2.0, 1.25), (4.6, 0.1, 2.6), PLASTER)
    box("wf_l", (-1.45, 2.0, 1.25), (1.7, 0.1, 2.6), PLASTER)
    box("wf_r", (1.45, 2.0, 1.25), (1.7, 0.1, 2.6), PLASTER)
    box("wf_top", (0, 2.0, 2.1), (1.2, 0.1, 0.9), PLASTER)
    box("wf_bot", (0, 2.0, 0.45), (1.2, 0.1, 0.9), PLASTER)
    box("window_glass", (0, 2.02, 1.25), (1.2, 0.02, 0.7), GLASS)
    box("kilim", (0.2, 0.2, 0.01), (2.4, 1.6, 0.01), KILIM)
    # divan along the back wall
    box("divan", (0, -1.6, 0.22), (3.0, 0.7, 0.44), WOOD)
    box("divan_seat", (0, -1.6, 0.5), (2.9, 0.65, 0.14), CUSHION)
    for i in range(4):
        blob(f"pillow{i}", (-1.05 + i * 0.7, -1.85, 0.75), (0.3, 0.1, 0.22), CUSHION)
    # stove + pipe on the left
    cyl("stove", (-1.8, 0.6, 0.45), 0.28, 0.8, METAL)
    box("stove_door", (-1.53, 0.6, 0.35), (0.02, 0.18, 0.14), FIRE)
    cyl("pipe", (-1.8, 0.6, 1.6), 0.06, 1.6, METAL)
    # wall clock with a swinging pendulum on the right wall
    box("clock", (2.22, -0.4, 1.7), (0.08, 0.35, 0.7), WOOD)
    cyl("clock_face", (2.17, -0.4, 1.9), 0.13, 0.02, PAINT, rot=(0, math.radians(90), 0))
    pend = cyl("pendulum", (2.17, -0.4, 1.55), 0.008, 0.35, METAL)
    disc = cyl("pend_disc", (2.17, -0.4, 1.38), 0.05, 0.01, METAL, rot=(0, math.radians(90), 0))
    pivot = bpy.data.objects.new("pivot", None); scn.collection.objects.link(pivot); pivot.location = (2.17, -0.4, 1.72)
    for o in (pend, disc):
        o.parent = pivot; o.location -= pivot.location
    for f in range(1, FRAMES + 1):
        pivot.rotation_euler = (math.radians(8) * math.sin(2 * math.pi * f / FPS / 2.0), 0, 0)
        pivot.keyframe_insert("rotation_euler", frame=f)
    # stove firelight (flickering) + moonlight through the window
    fire = light("POINT", (-1.45, 0.6, 0.4), 40, WARM)
    for f in range(1, FRAMES + 1):
        fire.data.energy = 14 + 10 * random.random(); fire.data.keyframe_insert("energy", frame=f)
    spot_at((0, 3.0, 2.2), (0.3, -0.4, 0.2), 260, 22, MOON)
    light("POINT", (0.5, 0, 2.0), 2, (0.6, 0.6, 0.7))


if SHOT == "yol":
    box("ground", (0, 40, -0.06), (80, 140, 0.1), GROUND)
    box("road", (0, 40, -0.01), (6.0, 140, 0.02), ROAD)
    for i in range(30):
        box(f"dash{i}", (0, i * 4.5, 0.005), (0.12, 2.0, 0.01), PAINT)
    TREE = mat("tree", (0.015, 0.02, 0.012), 0.9)
    for i in range(40):
        x = random.choice([-1, 1]) * random.uniform(4.5, 12); y = random.uniform(0, 110)
        blob(f"tree{i}", (x, y, 2.5), (1.0, 1.0, 2.5), TREE)
    for i in range(10):
        box(f"post{i}", (3.6, 8 + i * 11, 0.5), (0.1, 0.1, 1.0), PAINT)
    heads = [spot_at((x, 0.5, 0.8), (x * 1.4, 25, 0), 2500, 30, (1.0, 0.92, 0.75)) for x in (-0.7, 0.7)]
    # dashboard silhouette + seat back in front of the camera
    box("dash", (0, 0.9, 0.95), (2.0, 0.6, 0.2), DARK)
    cam = camera((0.35, -0.3, 1.25), (0.2, 30, 0.9), lens=28)
    dash = scn.objects["dash"]
    for f in range(1, FRAMES + 1):
        dy = 0.9 * f
        cam.location.y = -0.3 + dy; cam.keyframe_insert("location", frame=f)
        dash.location.y = 0.9 + dy; dash.keyframe_insert("location", frame=f)
        for hl in heads:
            hl.location.y = 0.5 + dy; hl.keyframe_insert("location", frame=f)

elif SHOT == "koy_dis":
    BG.default_value = (0.006, 0.008, 0.018, 1)
    box("hill", (0, 5, -0.1), (60, 60, 0.2), GROUND)
    box("house", (0, 6, 1.3), (6, 5, 2.6), PLASTER)
    for side in (-1, 1):  # pitched roof
        box(f"roof{side}", (0, 6 + side * 1.35, 3.25), (6.6, 3.0, 0.12), OLDWOOD, rot=(math.radians(-30 * side), 0, 0))
    box("door", (0.8, 3.47, 1.0), (0.9, 0.05, 2.0), WOOD)
    for x in (-1.6, 2.3):
        box(f"win{x}", (x, 3.47, 1.5), (0.8, 0.05, 0.8), GLASS)
    cyl("trunk", (-2.6, 2.0, 1.4), 0.18, 2.8, OLDWOOD)
    for i in range(7):  # dead branches
        a = random.uniform(0, 2 * math.pi); tilt = random.uniform(0.6, 1.1)
        cyl(f"br{i}", (-2.6 + 0.6 * math.cos(a), 2.0 + 0.6 * math.sin(a), 2.9 + random.uniform(-0.3, 0.4)), 0.04, 1.6, OLDWOOD,
            rot=(tilt * math.sin(a), tilt * math.cos(a), 0))
    for i in range(12):  # fence
        box(f"fence{i}", (-4.5 + i * 0.8, 0.5, 0.5), (0.06, 0.06, 1.0), OLDWOOD)
    sun = bpy.data.lights.new("moon", "SUN"); sun.energy = 0.07; sun.color = MOON
    so = bpy.data.objects.new("moon", sun); scn.collection.objects.link(so); so.rotation_euler = (math.radians(55), 0, math.radians(30))
    cam = camera((1.2, -6.0, 1.6), (0.3, 6, 1.6), lens=30)
    handheld(cam, 0.01, 0.003, push=(0, 1.2, 0))

elif SHOT in ("ev_ic", "hatice"):
    interior()
    if SHOT == "ev_ic":
        cam = camera((1.6, 1.6, 1.5), (-0.6, -1.4, 0.8), lens=22)
        handheld(cam, 0.004, 0.003, push=(-0.4, 0, 0))
    else:
        b, h = figure((0.5, -1.5, 0.45), 1.15, SCARF)
        blob("face", (0.5, -1.4, 0.45 + 1.15 * 0.9), (0.07, 0.04, 0.08), mat("skin", (0.06, 0.045, 0.035)))
        cam = camera((-0.6, 1.2, 1.25), (0.5, -1.5, 1.0), lens=35)
        handheld(cam, 0.003, 0.002)

elif SHOT == "esik":
    interior()
    box("door", (0, 1.95, 1.0), (0.9, 0.05, 2.0), WOOD)
    box("sill", (0, 1.85, 0.03), (1.0, 0.2, 0.06), OLDWOOD)
    for i in range(320):
        bpy.ops.mesh.primitive_ico_sphere_add(radius=random.uniform(0.0025, 0.005), subdivisions=1,
                                              location=(random.uniform(-0.45, 0.45), 1.78 + random.gauss(0, 0.012), 0.065))
        bpy.context.object.data.materials.append(SALT)
    light("POINT", (0.0, 1.5, 0.3), 3, WARM)
    gap = light("AREA", (0, 2.1, 0.02), 6, MOON, size=0.8)  # cold light under the door
    cam = camera((0.25, 1.0, 0.35), (0, 1.85, 0.05), lens=40)
    handheld(cam, 0.002, 0.002)

elif SHOT == "tavan_arasi":
    interior()
    box("hatch", (0.5, -0.3, 2.49), (0.7, 0.7, 0.03), OLDWOOD)
    cyl("rope", (0.5, 0.06, 2.3), 0.012, 0.45, mat("rope", (0.3, 0.25, 0.15)))
    cyl("hook", (0.5, 0.06, 2.07), 0.03, 0.04, METAL)
    cam = camera((0.2, 0.9, 1.0), (0.5, -0.3, 2.5), lens=30)
    handheld(cam, 0.002, 0.003, push=(0, -0.15, 0.1))

elif SHOT == "pencere":
    interior()
    bpy.data.objects.remove(scn.objects["window_glass"], do_unlink=True)
    BG.default_value = (0.008, 0.012, 0.025, 1)
    box("outside", (0, 8, -0.1), (20, 12, 0.2), GROUND)
    sun = bpy.data.lights.new("moon", "SUN"); sun.energy = 0.15; sun.color = MOON
    so = bpy.data.objects.new("moon", sun); scn.collection.objects.link(so); so.rotation_euler = (math.radians(60), 0, math.radians(170))
    TREE = mat("tree2", (0.01, 0.01, 0.01), 0.9)
    branches = []
    for i in range(5):
        o = cyl(f"br{i}", (random.uniform(-0.6, 0.6), 2.4, 1.0 + i * 0.12), 0.03, 1.4, TREE, rot=(0, random.uniform(-1, 1), 0))
        branches.append(o)
    for f in range(1, FRAMES + 1):
        for j, o in enumerate(branches):
            o.rotation_euler.x = 0.06 * math.sin(f / FPS * 2.4 + j); o.keyframe_insert("rotation_euler", frame=f)
    fb, fh = figure((0.25, 3.4, 0.0), 2.0)
    appear((fb, fh), 0.6)
    cam = camera((0.1, 0.6, 1.3), (0, 2.0, 1.25), lens=32)
    handheld(cam, 0.002, 0.002, push=(0, 0.25, 0))

bpy.ops.render.render(animation=True)
