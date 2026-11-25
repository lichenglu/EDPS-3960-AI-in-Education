"""Build the classroom with blender -b -t 4 --python art/classroom-studio/classroom.py."""
from math import cos, pi, sin
from pathlib import Path
import json

import bpy
from mathutils import Vector

art_dir = Path(__file__).resolve().parent
project = art_dir.parents[1]
studio = project / "src/features/quests/week-one/studio"
stations = json.loads((studio / "world-layout.json").read_text())
cast_layout = json.loads((studio / "cast-layout.json").read_text())
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
materials = {}
parent = None


def model(key, label, *, station="", character=""):
    """Create an interaction root while preserving the authored object positions."""
    group = bpy.data.objects.new("Model_" + key, None)
    bpy.context.collection.objects.link(group)
    group["label"] = label
    if station:
        group["station"] = station
    if character:
        group["character"] = character
    return group


def material(hex_color):
    if hex_color not in materials:
        values = [int(hex_color.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        rgba = (*[v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in values], 1)
        mat = bpy.data.materials.new("Clay " + hex_color)
        mat.use_nodes = True
        shader = mat.node_tree.nodes.get("Principled BSDF")
        shader.inputs["Base Color"].default_value = rgba
        shader.inputs["Roughness"].default_value = .74
        mat.diffuse_color = rgba
        materials[hex_color] = mat
    return materials[hex_color]


def position(x, y, z):
    return (x, -z, y)


def finish(obj, name, color):
    obj.name = name
    obj.data.materials.append(material(color))
    if parent:
        obj.parent = parent
    return obj


def box(name, x, y, z, w, h, d, color, radius=.07, twist=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position(x, y, z))
    obj = bpy.context.object
    obj.scale = (w, d, h)
    obj.rotation_euler.z = -twist
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Soft corners", "BEVEL")
    bevel.width = min(radius, .33 * min(w, h, d))
    bevel.segments = 3
    normal = obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    normal.keep_sharp = True
    return finish(obj, name, color)


def oval(name, x, y, z, w, h, d, color, lean=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=position(x, y, z))
    obj = bpy.context.object
    obj.scale = (w, d, h)
    obj.rotation_euler.y = lean
    for face in obj.data.polygons:
        face.use_smooth = True
    return finish(obj, name, color)


def cylinder(name, x, y, z, radius, h, color, top=None):
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=radius, radius2=radius if top is None else top,
                                   depth=h, location=position(x, y, z))
    obj = bpy.context.object
    bevel = obj.modifiers.new("Soft ends", "BEVEL")
    bevel.width = min(.045, h / 6)
    bevel.segments = 2
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return finish(obj, name, color)


def plant(x, y, z, s=1):
    global parent
    previous = parent
    parent = model(f"plant_{x}_{z}", "Potted plant", station=previous.get("station", "") if previous else "")
    cylinder("Terracotta planter", x, y + .19*s, z, .22*s, .37*s, "#cf8c64", .29*s)
    cylinder("Pot rim", x, y + .36*s, z, .3*s, .075*s, "#f1a885")
    for i, (dx, dz) in enumerate([(-.18, 0), (.15, .08), (.06, -.12), (-.1, -.12), (0, .07)]):
        oval("Rubber plant leaf", x + dx*s, y + (.58 + (i % 3)*.10)*s, z + dz*s,
             .115*s, (.28 + .05*(i % 2))*s, .09*s, ["#478c70", "#73ac72", "#93bd73"][i % 3], -dx*2.2)
    parent = previous


def books(x, y, z):
    for i, color in enumerate(["#e5a26e", "#7ba98d", "#f0cb78", "#94bbc2", "#bc9ac0"]):
        box("Cloth book", x+i*.17, y+.2+(i % 3)*.045, z, .145, .4+(i % 3)*.09, .34, color, .04)
        box("Book spine detail", x+i*.17, y+.15, z+.177, .08, .025, .015, "#f8e4ba")


oak = "#eab880"
wood = "#b47d52"
dark = "#694f3e"
cream = "#fff0d7"
mint = "#82b396"

# Foundation, plank floor, wainscoting and the two cutaway walls.
box("Rounded foundation", 0, -.27, 0, 13.8, .54, 10.65, "#92bb8e", .28)
box("Walnut floor inlay", 0, -.035, 0, 13.4, .18, 10.25, wood, .18)
for row in range(19):
    for column in range(4):
        book = ["#e9b981", "#edc38c", "#f2ca97", "#e4b27c"]
        box("Maple floorboard", -4.965 + column*3.31, .047, -4.74 + row*.526, 3.302, .08, .517,
            book[(row*11 + column*7 + row//3) % 4], .018)
box("Back wall", 0, 1.91, -5.07, 13.55, 3.82, .21, cream)
box("Back trim", 0, 3.82, -5.08, 13.6, .14, .25, "#a8c48a")
box("Left cutaway wall", -6.68, 1.46, -2.58, .21, 2.92, 5.07, cream)
box("Left trim", -6.67, 2.91, -2.58, .25, .14, 5.1, "#a8c48a")
for i in range(25):
    box("Back wall beadboard", -6.44+i*.536, .535, -4.93, .523, 1.07, .09, "#9ec2a6", .022)
for i in range(9):
    box("Side wall beadboard", -6.543, .535, -4.79+i*.54, .092, 1.07, .528, "#9ec2a6", .022)
box("Back chair rail", 0, 1.08, -4.84, 13.35, .14, .21, "#b9d3b1")
box("Side chair rail", -6.453, 1.08, -2.62, .21, .14, 4.89, "#b9d3b1")
parent = model("rug", "Classroom rug")
box("Rug border", .0, .095, .25, 4.82, .04, 3.7, "#83ad99", .012)
box("Rug center", .0, .119, .25, 4.66, .022, 3.54, "#b8d4b8", .007)
for i in range(9):
    box("Rug weave", -1.89+i*.47, .134, -.9 + (i % 3)*.71, .22, .008, .038, "#dbe5ba", .002)
for i in range(26):
    for z in (-1.64, 2.14):
        box("Rug fringe", -2.26 + i*.18, .102, z, .06, .025, .24, "#e4ddac", .009)

# Bay window with softly layered hills and a few little clouds.
parent = model("window", "Garden window")
box("Window frame", -3.42, 2.45, -4.82, 4.75, 2.33, .19, wood)
box("Sky", -3.42, 2.47, -4.706, 4.49, 2.05, .055, "#d9eae1")
for x, y, sx, sy, color in [
    (-4.68, 1.94, .95, .31, "#bfd29d"), (-3.22, 1.9, 1.21, .4, "#b1c694"),
    (-2.16, 1.82, .88, .26, "#a2c08a"), (-4.18, 1.67, 1.24, .23, "#90b68a"),
    (-2.62, 1.66, 1.18, .23, "#83ac88"),
]:
    oval("Garden hill", x, y, -4.663, sx, sy, .026, color)
oval("Morning sun", -2.2, 2.98, -4.666, .27, .27, .021, "#f7d58c")
for x, y in [(-4.75, 2.93), (-3.67, 3.2)]:
    for dx, dy in [(-.15, -.022), (0, .025), (.15, -.028)]:
        oval("Cloud", x+dx, y+dy, -4.658, .17, .077, .017, "#f9f2df")
for x in (-4.17, -2.65):
    box("Window mullion", x, 2.48, -4.598, .08, 2.05, .11, "#d19c67", .025)
box("Window sill", -3.42, 1.34, -4.60, 4.84, .13, .42, oak)

parent = model("chalkboard", "Chalkboard")
box("Chalkboard frame", 2.04, 2.54, -4.77, 3.89, 1.86, .22, wood)
box("Chalkboard", 2.04, 2.56, -4.64, 3.65, 1.61, .09, "#527c69")
for i, w in enumerate((1.56, 1.16, 1.38)):
    box("Chalk line", 1.72, 2.73-i*.24, -4.58, w, .047, .021, "#c2d9bc", .009)
box("Chalk ledge", 2.03, 1.59, -4.57, 3.92, .12, .31, oak)
parent = model("bunting", "Classroom bunting")
for i in range(9):
    x = .22 + i*.45
    box("Bunting pennant", x, 3.72 - sin(i*pi/8)*.21, -4.73, .31, .24, .10,
        ["#e8a489", "#efd18b", "#b4cb9d", "#a7cbd6"][i % 4], .04, 0)

parent = model("shelf", "Supply shelf")
for y in (.31, .82, 1.38):
    box("Supply shelf", 5.44, y, -4.44, 1.91, .13, .87, "#7eab93")
for x in (4.49, 6.39):
    box("Shelf side", x, .81, -4.43, .13, 1.47, .87, "#78a78c")
books(4.8, 1.47, -4.48)
plant(5.96, 1.46, -4.44, .66)
for i in range(3):
    box("Canvas supply bin", 4.86+i*.53, .55, -4.27, .42, .35, .56, ["#e8bc76", "#d89980", "#a2c6b1"][i])
    box("Bin label", 4.86+i*.53, .57, -3.985, .15, .073, .011, cream)
parent = None
plant(-5.63, .09, -3.92, 1.35)
plant(5.77, .09, -.55, 1.17)

# Character geometry uses local proportions while keeping the authored floor and placement.
def character_geometry(x, z, scale):
    def ball(name, dx, y, dz, rx, ry, rz, color, lean=0):
        return oval(name, x + dx*scale, .09 + y*scale, z + dz*scale,
                    rx*scale, ry*scale, rz*scale, color, lean)

    def rounded_box(name, dx, y, dz, w, h, d, color, radius=.10, twist=0):
        return box(name, x + dx*scale, .09 + y*scale, z + dz*scale,
                   w*scale, h*scale, d*scale, color, radius*scale, twist)

    def swept(name, rings, color, sides=12):
        """Join elliptical rings along a curve while keeping adjacent rings aligned."""
        centers = [Vector(position(x + dx*scale, .09 + y*scale, z + dz*scale))
                   for dx, y, dz, _, _ in rings]
        vertices = []
        previous_tangent = None
        for i, (center, (_, _, _, radius_side, radius_up)) in enumerate(zip(centers, rings)):
            tangent = (centers[min(i + 1, len(centers) - 1)] - centers[max(i - 1, 0)]).normalized()
            if previous_tangent is None:
                side = Vector((0, 0, 1)).cross(tangent)
                if side.length < .01:
                    side = Vector((0, 1, 0)).cross(tangent)
            else:
                side = previous_tangent.rotation_difference(tangent) @ side
            side.normalize()
            previous_tangent = tangent
            up = tangent.cross(side)
            for j in range(sides):
                angle = 2*pi*j / sides
                vertices.append(center + scale*(side*(radius_side*cos(angle)) + up*(radius_up*sin(angle))))

        faces = []
        for i in range(0, len(vertices) - sides, sides):
            for j in range(sides):
                following = (j + 1) % sides
                faces.append((i + j, i + following, i + sides + following, i + sides + j))
        faces.append(tuple(reversed(range(sides))))
        faces.append(tuple(range(len(vertices) - sides, len(vertices))))
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], faces)
        for face in mesh.polygons:
            face.use_smooth = True
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        return finish(obj, name, color)

    return ball, rounded_box, swept


# The three original guides share a plush body and species-specific features.
def animal(species, x, z, scale=1):
    s = scale
    def ball(name, dx, y, dz, w, h, d, color, lean=0):
        return oval(name, x+dx*s, .09+y*s, z+dz*s, w*s, h*s, d*s, color, lean)
    def round_box(name, dx, y, dz, w, h, d, color):
        return box(name, x+dx*s, .09+y*s, z+dz*s, w*s, h*s, d*s, color)
    colors = {
        "panda": ("#f9efd8", "#4c453c", "#78a48a", "#fff6e6"),
        "red": ("#d88149", "#764534", "#72a383", "#ffe4bd"),
        "monkey": ("#eaae55", "#bc7f37", "#ebad62", "#a8ced0"),
    }
    base, accent, clothing, mask = colors[species]
    ball("Rounded body", 0, .48, 0, .38, .49, .28, base)
    for side in (-1, 1):
        ball("Round foot", side*.22, .135, .155, .17, .14, .22, accent)
        ball("Soft paw", side*.343, .52, .075, .115, .23, .12, accent, side*.26)
    ball("Canvas apron", 0, .48, .219, .277, .329, .105, clothing)
    round_box("Apron pocket", 0, .37, .314, .24, .156, .044, "#f2deb0")
    ball("Head", 0, 1.04, .042, .49, .447, .384, base)
    for side in (-1, 1):
        size = .18 if species in ("panda", "monkey") else .132
        ball("Ear", side*(.399 if species == "monkey" else .315), 1.365, .045, size, size*1.13, .105, accent, side*.21)
        if species != "panda":
            ball("Inner ear", side*(.399 if species == "monkey" else .315), 1.376, .125, size*.62, size*.72, .051, mask)
    if species == "panda":
        for side in (-1, 1):
            ball("Panda eye patch", side*.179, 1.04, .37, .128, .171, .074, accent, side*.19)
    if species == "monkey":
        ball("Facial mask", 0, .995, .357, .317, .286, .113, mask)
    if species == "red":
        for side in (-1, 1):
            ball("Red panda eyebrow", side*.178, 1.18, .377, .093, .049, .047, cream, side*.13)
            ball("Red panda cheek", side*.277, .937, .337, .15, .08, .079, mask, side*.24)
        for i in range(7):
            ball("Striped tail", .37+i*.102, .245-.014*i, -.16+i*.062, .169-.01*i,
                 .145-.009*i, .158-.007*i, base if i % 2 else accent)
    if species == "monkey":
        ball("Golden forelock", -.07, 1.421, .112, .177, .114, .108, "#f3c074", -.39)
    for side in (-1, 1):
        ball("Button eye", side*.176, 1.055, .429, .056, .073, .043, "#352d29")
        ball("Eye highlight", side*.176-.014, 1.082, .465, .015, .017, .01, "#fff8e7")
        ball("Rosy cheek", side*.275, .949, .394, .059, .035, .026, "#e4a38d")
    ball("Soft muzzle", 0, .924, .399, .167, .106, .111, mask)
    ball("Nose", 0, .967, .502, .061, .034, .032, "#503a30")


def build_capybara(x, z, scale):
    from mathutils import Matrix

    ball, rounded_box, swept = character_geometry(x, z, scale)
    coat = "#b98250"
    head = "#c58e59"
    paw = "#916240"
    dark = "#54372c"
    eye = "#352d29"
    scarf = "#e8b74e"

    ball("Capybara barrel body", 0, .46, -.196, .422, .402, .475, coat)
    ball("Capybara chest", 0, .556, .072, .342, .353, .304, coat)
    for side in (-1, 1):
        ball("Capybara haunch", side * .248, .275, -.371, .162, .235, .245, coat)
        ball("Capybara back foot", side * .286, .107, -.35, .129, .108, .18, paw)
        ball("Capybara short front leg", side * .231, .173, .213, .131, .139, .140, coat)
        ball("Capybara front foot", side * .231, .091, .267, .125, .092, .157, paw)
        for toe in (-1, 0, 1):
            ball("Capybara toe", side * .231 + toe * .054, .063, .391,
                 .035, .042, .052, paw)

    ball("Capybara neckerchief collar", 0, .749, .075, .329, .088, .265, scarf)
    ball("Capybara neckerchief knot", -.127, .712, .320, .088, .065, .046, scarf, -.2)
    rounded_box("Capybara neckerchief end", -.174, .625, .338, .126, .158, .049,
                scarf, radius=.034, twist=-.18)

    # One continuous form keeps the forehead and the long, blunt nose in silhouette.
    swept("Capybara broad blunt muzzle", [
        (0, 1.01, -.253, .065, .069),
        (0, 1.035, -.205, .228, .186),
        (0, 1.047, -.083, .334, .245),
        (0, 1.043, .064, .361, .272),
        (0, 1.025, .220, .357, .249),
        (0, 1.008, .371, .340, .228),
        (0, .996, .507, .310, .203),
        (0, .987, .600, .269, .174),
        (0, .984, .652, .215, .145),
        (0, .985, .677, .142, .103),
        (0, .987, .689, .055, .049),
    ], head, sides=28)
    for side in (-1, 1):
        ball("Capybara small high ear", side * .220, 1.298, -.025,
             .063, .072, .058, paw, side * .31)
        ball("Capybara inset ear", side * .228, 1.309, .022,
             .036, .043, .022, "#b47857", side * .31)
        cheek = ball("Capybara cheek", side * .278, .990, .574, .054, .029, .020, "#d69b80")
        cheek.rotation_euler.z = side * 1.01
        pupil = ball("Capybara eye", side * .249, 1.127, .478, .060, .065, .037, eye)
        pupil.rotation_euler.z = side * .71
        ball("Capybara eye shine", side * .265 - .013, 1.147, .502,
             .016, .017, .011, "#fff8e7")
    ball("Capybara broad nose pad", 0, 1.049, .665, .144, .040, .033, "#ac7447")
    for side in (-1, 1):
        ball("Capybara nostril", side * .066, 1.052, .693, .029, .015, .010,
             dark, side * .22)
    swept("Capybara small smile", [
        (-.096, .902, .682, .004, .004),
        (-.055, .895, .688, .008, .008),
        (0, .892, .692, .009, .009),
        (.055, .895, .688, .008, .008),
        (.096, .902, .682, .004, .004),
    ], dark, sides=8)

    # Turn the pose toward the seat so the guide camera shows the muzzle in profile.
    pivot = Vector(position(x, 0, z))
    pose = Matrix.Translation(pivot) @ Matrix.Rotation(.43, 4, "Z") @ Matrix.Translation(-pivot)
    for part in parent.children:
        part.matrix_basis = pose @ part.matrix_basis

def build_pangolin(x, z, scale):
    """Xinlin's soft shingled coat, pointed snout and curled, tapering tail."""
    from mathutils import Matrix, Vector

    ball, _, swept = character_geometry(x, z, scale)
    hide = "#af784e"
    face = "#e2b58d"
    cream = "#edceab"
    claw = "#f3d9af"
    brown = "#3b2822"
    tones = ("#bd8245", "#cc9252", "#ad7142", "#c28a4d")
    scale_meshes = {}

    def scale_mesh(color):
        if color in scale_meshes:
            return scale_meshes[color]
        # A gently domed plate. Its wide root slips under the next plate,
        # and the narrow tip rests above the previous row.
        sections = [
            (-.51, .09, .12, .22),
            (-.40, .37, .20, .55),
            (-.22, .48, .23, .89),
            ( .00, .50, .21, 1.0),
            ( .22, .40, .18, .88),
            ( .43, .24, .12, .68),
            ( .58, .035, .04, .43),
        ]
        sides = 10
        vertices = []
        for along, width, underside, crown in sections:
            for i in range(sides):
                angle = i * 2 * pi / sides
                height = sin(angle)
                vertices.append((width * cos(angle), along, height * (crown if height >= 0 else underside)))

        polygons = [tuple(range(sides))]
        for row in range(len(sections) - 1):
            for i in range(sides):
                index = row * sides
                next_side = (i + 1) % sides
                polygons.append((index + i, index + i + sides, index + next_side + sides, index + next_side))
        polygons.append(tuple(reversed(range(len(vertices) - sides, len(vertices)))))
        mesh = bpy.data.meshes.new("Pangolin sculpted plate")
        mesh.from_pydata(vertices, [], polygons)
        mesh.update()
        mesh.materials.append(material(color))
        for polygon in mesh.polygons:
            polygon.use_smooth = len(polygon.vertices) == 4
        scale_meshes[color] = mesh
        return mesh

    def plate(name, center, normal, tip, width, length, relief, color):
        outward = Vector(normal).normalized()
        tangent = Vector(tip)
        along = (tangent - tangent.dot(outward) * outward).normalized()
        across = along.cross(outward)
        axis_x = position(*(across * width * scale))
        axis_y = position(*(along * length * scale))
        axis_z = position(*(outward * relief * scale))
        anchor = position(x + center[0] * scale, .09 + center[1] * scale, z + center[2] * scale)
        obj = bpy.data.objects.new(name, scale_mesh(color))
        bpy.context.collection.objects.link(obj)
        obj.parent = parent
        obj.matrix_basis = Matrix((
            (axis_x[0], axis_y[0], axis_z[0], anchor[0]),
            (axis_x[1], axis_y[1], axis_z[1], anchor[1]),
            (axis_x[2], axis_y[2], axis_z[2], anchor[2]),
            (0, 0, 0, 1),
        ))

    ball("Pangolin haunches", 0, .47, -.12, .36, .414, .31, hide)
    ball("Pangolin shoulder", 0, .76, -.075, .306, .294, .265, hide)
    ball("Pangolin unarmored belly", 0, .496, .102, .253, .326, .165, cream)
    for side in (-1, 1):
        ball("Pangolin hind leg", side * .168, .169, .065, .103, .127, .132, hide, side * .12)
        ball("Pangolin hind foot", side * .18, .094, .156, .119, .093, .16, hide)
        ball("Pangolin front leg", side * .255, .486, .175, .092, .176, .094, face, -side * .44)
        ball("Pangolin front paw", side * .208, .371, .247, .082, .081, .075, hide)
        for toe in range(3):
            ball("Pangolin digging claw", side * (.151 + .037 * toe), .07, .288, .016, .021, .044 - .007 * toe, claw)
            ball("Pangolin front claw", side * (.178 + .029 * toe), .337, .291, .014, .029, .023, claw)

    tail = (
        (.12, .274, -.252, .158, .151),
        (.305, .248, -.353, .174, .149),
        (.478, .206, -.376, .152, .124),
        (.637, .153, -.302, .124, .094),
        (.744, .119, -.175, .095, .072),
        (.804, .097, -.031, .067, .053),
        (.830, .082, .111, .041, .037),
        (.813, .071, .225, .017, .018),
        (.797, .067, .265, .006, .007),
    )
    swept("Pangolin curling tail", tail, hide)
    for row in range(1, len(tail) - 1):
        center = Vector(tail[row][:3])
        forward = (Vector(tail[row + 1][:3]) - Vector(tail[row - 1][:3])).normalized()
        aside = forward.cross(Vector((0, 1, 0))).normalized()
        upper = aside.cross(forward)
        radius_x, radius_y = tail[row][3:]
        for column, degrees in enumerate((-66, -30, 6, 42, 78) if row % 2 else (-48, -12, 24, 60)):
            angle = degrees * pi / 180
            normal = aside * sin(angle) + upper * cos(angle)
            contact = center + aside * (radius_x * .93 * sin(angle)) + upper * (radius_y * .93 * cos(angle))
            plate("Pangolin tail plate", contact, normal, forward,
                  .70 * radius_x, .109 + .39 * radius_x, .013 + .22 * radius_x, tones[(row + column) % len(tones)])

    # The edge of the mantle curls forward at both shoulders, so its
    # staggered rows read from the guide camera as well as the side.
    coat_rows = (
        (.935, -.095, .243, .206, 58, 9, .154, .156, .36),
        (.832, -.102, .290, .248, 45, 11, .150, .184, .18),
        (.712, -.115, .323, .266, 59, 9, .179, .206, .12),
        (.581, -.124, .350, .293, 54, 11, .172, .214, .05),
        (.440, -.120, .353, .307, 69, 9, .172, .204, -.08),
        (.310, -.133, .312, .270, 77, 7, .169, .176, -.22),
        (.211, -.149, .253, .220, 92, 5, .162, .151, -.36),
    )
    for row, (height, mid_z, width, depth, start, count, plate_width, length, tilt) in enumerate(coat_rows):
        for column in range(count):
            angle = (start + (360 - 2 * start) * column / (count - 1)) * pi / 180
            center = (width * sin(angle), height, mid_z + depth * cos(angle))
            normal = (sin(angle), tilt, cos(angle))
            plate("Pangolin mantle plate", center, normal, (0, -1, 0),
                  plate_width, length, .044, tones[(row * 3 + column) % len(tones)])

    body_parts = set(parent.children)
    swept("Pangolin tapered head", (
        (0, 1.061, -.183, .123, .163),
        (0, 1.104, -.102, .242, .223),
        (0, 1.102,  .023, .266, .236),
        (0, 1.069,  .161, .228, .195),
        (0, 1.007,  .295, .163, .128),
        (0,  .948,  .407, .105, .076),
        (0,  .918,  .495, .065, .047),
        (0,  .902,  .532, .045, .033),
    ), face)
    # The cap overlaps the forehead behind the eyes and tapers onto the neck.
    crown_plates = (
        ((0, 1.310, -.143), (0, .84, -.55), (0, -.55, -.84), .142, .145, 0),
        ((-.123, 1.297, -.119), (-.40, .83, -.36), (0, -.65, -.76), .136, .146, 2),
        (( .123, 1.297, -.119), ( .40, .83, -.36), (0, -.65, -.76), .136, .146, 1),
        ((-.219, 1.251, -.082), (-.75, .63, -.20), (0, -.60, -.80), .103, .131, 3),
        (( .219, 1.251, -.082), ( .75, .63, -.20), (0, -.60, -.80), .103, .131, 3),
        ((0, 1.325, .039), (0, .98, .16), (0, -.22, 1), .166, .200, 1),
        ((-.132, 1.285, .065), (-.40, .86, .22), (0, -.17, 1), .133, .169, 0),
        (( .132, 1.285, .065), ( .40, .86, .22), (0, -.17, 1), .133, .169, 0),
    )
    for center, normal, tip, width, length, color in crown_plates:
        anchor = Vector(center) - .011 * Vector(normal).normalized()
        plate("Pangolin forehead plate", anchor, normal, tip, width, length, .033, tones[color])

    for side in (-1, 1):
        ball("Pangolin little ear", side * .226, 1.169, .019, .059, .087, .058, hide, -side * .16)
        ball("Pangolin ear center", side * .244, 1.172, .058, .035, .052, .029, "#e3aa8f")
        ball("Pangolin eye", side * .19, 1.102, .249, .060, .076, .047, brown, side * .23)
        ball("Pangolin eye glint", side * .19 - .016, 1.127, .286, .016, .017, .011, "#fff5df")
        ball("Pangolin blush", side * .166, 1.016, .302, .049, .029, .029, "#df9a85")
        swept("Pangolin smile", (
            (side * .012, .882, .508, .004, .004),
            (side * .051, .883, .485, .009, .008),
            (side * .084, .902, .447, .007, .007),
            (side * .094, .915, .424, .003, .003),
        ), "#9b664b", sides=8)
    ball("Pangolin button nose", 0, .910, .526, .057, .031, .038, brown)
    ball("Pangolin nose glint", -.014, .926, .555, .018, .006, .007, "#b47f63")

    # Keep the studio cast's broad plush heads while showing the taper in a three-quarter view.
    pivot = Vector(position(x, .09 + 1.04 * scale, z + .05 * scale))
    turn = Matrix.Rotation(-13 * pi / 180, 4, "Z")
    shape = Matrix.Diagonal((1.16, .94, 1.07, 1))
    pose = Matrix.Translation(pivot) @ turn @ shape @ Matrix.Translation(-pivot)
    for part in parent.children:
        if part not in body_parts:
            part.matrix_basis = pose @ part.matrix_basis

def build_ibis(x, z, scale):
    ball, _, swept = character_geometry(x, z, scale)
    porcelain = "#fff3e6"
    feather_pink = "#edb4a9"
    feather_cream = "#f8d8c7"
    coral = "#d45b51"
    dark_coral = "#b9564c"
    bill_dark = "#43353d"
    yaw = -.86
    c, s = cos(yaw), sin(yaw)

    def pose(dx, dz):
        return dx*c + dz*s, dz*c - dx*s

    def feather(name, dx, y, dz, width, height, depth, color, lean=0, turn=0):
        dx, dz = pose(dx, dz)
        obj = ball(name, dx, y, dz, width, height, depth, color, lean)
        obj.rotation_euler.z = yaw + turn
        return obj

    def curve(name, rings, color, sides=12):
        posed = []
        for dx, y, dz, width, depth in rings:
            dx, dz = pose(dx, dz)
            posed.append((dx, y, dz, width, depth))
        return swept(name, posed, color, sides)

    # A round toy-like head sits above the curved neck and compact body.
    feather("Ibis body", 0, .615, -.067, .299, .266, .363, porcelain)
    neck = curve("Ibis curved neck", [
        (0, .587, .057, .144, .170),
        (0, .701, .120, .177, .182),
        (0, .825, .204, .148, .127),
        (0, .957, .216, .116, .111),
        (0, 1.081, .174, .105, .107),
        (0, 1.167, .142, .105, .107),
        (0, 1.270, .158, .118, .113),
    ], porcelain, 16)
    neck.modifiers.new("Soft neck curve", "SUBSURF").render_levels = 1
    head = feather("Ibis head", 0, 1.269, .142, .245, .217, .215, porcelain)
    face = feather("Ibis bare coral face", 0, 1.257, .255, .224, .145, .116, coral)
    for piece in (head, face):
        piece.modifiers.new("Soft face contours", "SUBSURF").render_levels = 1
    for side in (-1, 1):
        feather("Ibis gentle eye", side*.138, 1.287, .332, .053, .063, .032, "#352d29", turn=side*.34)
        feather("Ibis eye glint", side*.138-.012, 1.307, .360, .014, .016, .008, "#fff8e7")
        feather("Ibis small cheek", side*.137, 1.214, .338, .030, .014, .008, "#ef9180", turn=side*.34)

    # The exposed coral reaches the base of the long decurved bill.
    curve("Ibis decurved charcoal bill", [
        (0, 1.226, .308, .084, .056),
        (0, 1.218, .385, .080, .047),
        (0, 1.187, .475, .065, .039),
        (0, 1.146, .556, .055, .030),
        (0, 1.096, .623, .043, .023),
        (0, 1.047, .668, .031, .017),
        (0, 1.024, .685, .024, .014),
    ], bill_dark, 16)
    curve("Ibis vermilion bill tip", [
        (0, 1.029, .681, .027, .015),
        (0, 1.002, .700, .022, .012),
        (0, .977, .714, .012, .008),
        (0, .968, .715, .003, .003),
    ], coral)

    # Combed-back nape plumes and folded blush flight feathers.
    for i, dx in enumerate((-.117, -.061, 0, .061, .117)):
        lift = (2 - abs(i - 2))*.024
        curve("Ibis swept nape plume", [
            (dx*.62, 1.348+lift, .069, .053, .051),
            (dx*.89, 1.401+lift, -.042, .053, .049),
            (dx*1.16, 1.413+lift, -.151, .046, .040),
            (dx*1.32, 1.391+lift, -.245, .031, .026),
            (dx*1.37, 1.350+lift, -.308-lift, .006, .007),
        ], porcelain if i % 2 else feather_cream)
    for side in (-1, 1):
        feather("Ibis wing cover", side*.225, .713, -.098, .092, .166, .245, feather_cream, lean=side*.1)
        for i in range(3):
            curve("Ibis folded wing feather", [
                (side*(.268+i*.011), .777-i*.047, .051-i*.032, .040, .045),
                (side*(.299+i*.012), .740-i*.043, -.075-i*.036, .037, .044),
                (side*(.289+i*.012), .678-i*.046, -.218-i*.036, .031, .034),
                (side*(.252+i*.010), .642-i*.049, -.327-i*.024, .014, .016),
                (side*(.228+i*.010), .629-i*.049, -.362-i*.024, .003, .004),
            ], (porcelain, feather_cream, feather_pink)[i])
    for dx in (-.091, 0, .091):
        curve("Ibis tapered tail feather", [
            (dx*.70, .626, -.274, .067, .049),
            (dx, .602, -.378, .058, .039),
            (dx*1.18, .570, -.485, .043, .028),
            (dx*1.19, .554, -.533, .010, .009),
        ], feather_pink if dx else feather_cream)

    for side in (-1, 1):
        dx, dz = side*.126, side*.047
        feather("Ibis feathered hip", dx*.95, .381, dz-.054, .074, .085, .081, porcelain)
        curve("Ibis coral wading leg", [
            (dx*.90, .434, dz-.055, .056, .053),
            (dx, .341, dz-.010, .046, .044),
            (dx*1.06, .223, dz-.035, .041, .039),
            (dx*1.10, .102, dz+.007, .034, .035),
            (dx*1.10, .035, dz+.044, .032, .030),
        ], dark_coral)
        for toe in (-1, 0, 1):
            curve("Ibis forward toe", [
                (dx*1.10+toe*.009, .038, dz+.023, .027, .025),
                (dx*1.10+toe*.032, .029, dz+.089, .021, .022),
                (dx*1.10+toe*.064, .026, dz+.144-.021*abs(toe), .015, .017),
                (dx*1.10+toe*.073, .025, dz+.173-.025*abs(toe), .005, .006),
            ], coral, 10)
        curve("Ibis rear toe", [
            (dx*1.10, .036, dz+.033, .022, .025),
            (dx*1.14, .027, dz-.014, .018, .020),
            (dx*1.22, .024, dz-.052, .004, .006),
        ], coral, 10)

    # A small accent carries Guimin's help-desk palette onto the model.
    feather("Ibis lavender badge", .098, .770, .288, .068, .051, .022, "#b1a4ce", lean=-.36, turn=.40)
    feather("Ibis badge pin", .101, .776, .311, .016, .016, .008, "#f7ebce")


original_species = {"transcript": "panda", "reading": "red", "tickets": "monkey"}
guest_models = {"hints": build_ibis, "toolkit": build_pangolin}
desk_names = ["Sound desk", "Reading corner", "Sticky-note wall", "Help desk", "Planning board"]
tool_names = ["Classroom recorder", "Books and club cards", "Exit-ticket tray", "Riddle assistant", "App toolkit"]
for i, station in enumerate(stations):
    x, z, tint = station["x"], station["z"], station["color"]
    key = station["id"]
    parent = model("desk_" + key, desk_names[i], station=key)
    box("Pastel floor mat", x, .105, z, 2.67, .035, 1.94, tint, .016)
    for dx in (-.91, .91):
        for dz in (-.45, .45):
            box("Taper-soft desk leg", x+dx, .552, z+dz, .145, .94, .145, wood, .048)
    box("Writing desk top", x, 1.035, z, 2.26, .18, 1.22, oak, .085)
    box("Desk drawer", x, .867, z+.39, 1.77, .17, .47, tint, .052)
    box("Brass handle", x, .863, z+.66, .32, .065, .09, "#bb884c", .029)
    parent = model("cast_" + key, key, character=key)
    cast = cast_layout["characters"][key]
    placement = (cast["x"], cast["z"], cast["scale"])
    if key in guest_models:
        guest_models[key](*placement)
    else:
        animal(original_species[key], *placement)

    parent = model("tool_" + key, tool_names[i], station=key)
    if i == 0:
        box("Tape recorder body", x-.55, 1.28, z+.19, .73, .35, .46, "#7cabbe", .09)
        box("Recorder face", x-.55, 1.30, z+.425, .50, .205, .042, "#e9ebc8", .015)
        for j in range(7):
            box("Waveform bar", x-.73+j*.055, 1.299, z+.45, .026, .035+.021*((j*3)%5), .015, "#4a7977", .005)
        cylinder("Microphone stand", x-.73, 1.17, z-.25, .17, .10, "#437b78")
        cylinder("Microphone post", x-.73, 1.37, z-.25, .039, .35, "#578c87")
        oval("Foam microphone", x-.73, 1.58, z-.23, .127, .16, .106, "#5c888a", .22)
    if i == 1:
        books(x-.94, 1.13, z+.11)
        box("Open book cover", x-.16, 1.15, z+.28, .78, .085, .44, "#ca8f6d", .027, -.14)
        for side in (-1, 1):
            box("Book page", x-.16+side*.177, 1.199, z+.282, .34, .041, .4, cream, .015, -.14)
    if i == 2:
        box("Sticky board", x-.44, 1.66, z-.31, 1.04, .95, .16, "#c79563")
        for row in range(2):
            for col in range(3):
                box("Exit ticket", x-.735+col*.29, 1.83-row*.34, z-.209, .23, .26, .042,
                    ["#f4d484", "#f3bca7", "#bcd5a2", "#a8c9cf"][(row+col)%4], .015)
    if i == 3:
        box("Chat terminal base", x-.54, 1.19, z+.06, .92, .123, .49, "#b0a4c4")
        box("Chat terminal shell", x-.53, 1.514, z-.075, .92, .65, .17, "#a69ab9")
        box("Chat terminal screen", x-.53, 1.515, z+.018, .78, .51, .032, "#4b7772", .012)
        for j in range(3):
            box("Speech bubble", x-.56+(-1)**j*.10, 1.65-j*.126, z+.04, .30, .074, .021,
                "#dce6b9" if j % 2 else "#a4d1c9", .01)
    if i == 4:
        for j, color in enumerate(("#d18d72", "#b7c87d", "#8bb6be")):
            box("Toolkit index box", x-.77+j*.31, 1.31+(j%2)*.077, z+.19, .24, .37+(j%2)*.15, .47, color)
            box("Toolkit label", x-.77+j*.31, 1.30+(j%2)*.077, z+.439, .14, .079, .022, cream)
        plant(x-.62, 1.13, z-.31, .65)
    parent = None

# Gokhan welcomes students from the aisle beside the bench.
bench = cast_layout["welcomeBench"]
bx, bz = bench["x"], bench["z"]
parent = model("bench", "Welcome bench", character="gokhan")
box("Guest bench seat", bx, .45, bz, 1.45, .17, .7, "#e2ae77")
for offset in (-.60, .60):
    box("Guest bench leg", bx+offset, .24, bz, .13, .42, .49, wood)
box("Guest guide cards", bx-.35, .59, bz+.04, .43, .10, .34, "#eac770")
parent = model("cast_gokhan", "gokhan", character="gokhan")
cast = cast_layout["characters"]["gokhan"]
build_capybara(cast["x"], cast["z"], cast["scale"])

output = project / "public/studio/models"
output.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(art_dir / "classroom.blend"))
bpy.ops.export_scene.gltf(filepath=str(output / "classroom.glb"), export_format="GLB", export_apply=True, export_extras=True)
