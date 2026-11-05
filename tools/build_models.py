"""
Convierte modelos STL de huesos reales (BodyParts3D y escaneos con licencia abierta)
al formato compacto que usa la app (public/models/*.bin + manifest.json).

Uso:  python tools/build_models.py <carpeta_con_stl_y_meta.json> public/models

- Solo usa la biblioteca estándar de Python.
- Coordenadas de salida (decímetros):  X = derecha(-)/izquierda(+) del paciente,
  Y = arriba, Z = anterior.  BodyParts3D usa (x, y=-anterior, z=arriba) en mm.
- Simplifica mallas pesadas por agrupamiento de vértices (vertex clustering).
"""
import json
import math
import os
import struct
import sys
from collections import defaultdict

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
META = json.load(open(os.path.join(SRC, "meta.json"), encoding="utf8"))


def read_stl(path):
    data = open(path, "rb").read()
    tris = []
    if data[:5].lower() == b"solid" and b"facet" in data[:400]:
        v = []
        for line in data.decode("latin1").splitlines():
            t = line.split()
            if t and t[0] == "vertex":
                v.append((float(t[1]), float(t[2]), float(t[3])))
        return [tuple(v[i:i + 3]) for i in range(0, len(v) - 2, 3)]
    n = struct.unpack_from("<I", data, 80)[0]
    off = 84
    for _ in range(n):
        f = struct.unpack_from("<12f", data, off)
        off += 50
        tris.append((f[3:6], f[6:9], f[9:12]))
    return tris


def bp3d_to_app(p):
    x, y, z = p
    return (x / 100.0, z / 100.0, -y / 100.0)


def cluster(tris, cell):
    """Soldar vértices y simplificar: cada celda de la grilla se vuelve un vértice."""
    acc = {}
    idx = {}
    out_tris = []
    for t in tris:
        ids = []
        for p in t:
            k = (round(p[0] / cell), round(p[1] / cell), round(p[2] / cell))
            if k not in idx:
                idx[k] = len(idx)
                acc[k] = [0.0, 0.0, 0.0, 0]
            a = acc[k]
            a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3] += 1
            ids.append(idx[k])
        if ids[0] != ids[1] and ids[1] != ids[2] and ids[0] != ids[2]:
            out_tris.append(tuple(ids))
    verts = [None] * len(idx)
    for k, i in idx.items():
        a = acc[k]
        verts[i] = (a[0] / a[3], a[1] / a[3], a[2] / a[3])
    seen = set()
    uniq = []
    for t in out_tris:
        key = tuple(sorted(t))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(t)
    return verts, uniq


def components(verts, tris):
    parent = list(range(len(verts)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for a, b, c in tris:
        ra, rb, rc = find(a), find(b), find(c)
        parent[rb] = ra
        parent[find(rc)] = ra
    groups = defaultdict(list)
    for t in tris:
        groups[find(t[0])].append(t)
    return list(groups.values())


def subset(verts, tris):
    used = sorted({i for t in tris for i in t})
    remap = {o: n for n, o in enumerate(used)}
    return [verts[o] for o in used], [(remap[a], remap[b], remap[c]) for a, b, c in tris]


def bbox(verts):
    xs, ys, zs = zip(*verts)
    return [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)]


def axis_samples(verts, n=21):
    """Centroide de cortes horizontales: sirve para ubicar fracturas a una altura relativa."""
    lo, hi = bbox(verts)
    out = []
    for i in range(n):
        y = lo[1] + (hi[1] - lo[1]) * i / (n - 1)
        h = (hi[1] - lo[1]) / (n - 1) * 0.6
        sl = [v for v in verts if abs(v[1] - y) <= h]
        if not sl:
            out.append(None)
            continue
        cx = sum(v[0] for v in sl) / len(sl)
        cz = sum(v[2] for v in sl) / len(sl)
        r = max(math.hypot(v[0] - cx, v[2] - cz) for v in sl)
        out.append([round(cx, 4), round(y, 4), round(cz, 4), round(r, 4)])
    return out


def write_bin(name, verts, tris):
    lo, hi = bbox(verts)
    span = [max(hi[i] - lo[i], 1e-6) for i in range(3)]
    big = len(verts) > 65535
    buf = bytearray(b"RSM1")
    buf += struct.pack("<II", len(verts), len(tris) * 3)
    buf += struct.pack("<6f", *lo, *hi)
    for v in verts:
        buf += struct.pack("<3H", *[int(round((v[i] - lo[i]) / span[i] * 65535)) for i in range(3)])
    if len(buf) % 4:
        buf += b"\0" * (4 - len(buf) % 4)
    fmt = "<3I" if big else "<3H"
    for t in tris:
        buf += struct.pack(fmt, *t)
    open(os.path.join(OUT, name + ".bin"), "wb").write(buf)
    return len(buf)


manifest = {"bones": {}, "sources": {}}


def emit(name, verts, tris, src_key, axis=True):
    size = write_bin(name, verts, tris)
    lo, hi = bbox(verts)
    manifest["bones"][name] = {
        "file": name + ".bin",
        "tris": len(tris),
        "min": [round(v, 4) for v in lo],
        "max": [round(v, 4) for v in hi],
        "axis": axis_samples(verts) if axis else None,
        "source": src_key,
    }
    print(f"  {name:22s} tris={len(tris):6d}  {size/1024:7.1f} KB")


def load(key, cell, side=None, transform=bp3d_to_app):
    tris = read_stl(os.path.join(SRC, key + ".stl"))
    if side:
        keep = []
        for t in tris:
            cx = (t[0][0] + t[1][0] + t[2][0]) / 3
            if (side == "right" and cx < 0) or (side == "left" and cx > 0):
                keep.append(t)
        tris = keep
    tris = [tuple(transform(p) for p in t) for t in tris]
    return cluster(tris, cell)


def src(key):
    m = META[key]
    manifest["sources"][key] = {k: m.get(k, "") for k in ("title", "license", "licenseUrl", "artist", "source")}
    return key


# ---------------------------------------------------------------- huesos principales
print("Huesos (lado derecho, detalle alto)")
for key, cell in [("femur", 0.012), ("tibia", 0.012), ("fibula", 0.010), ("patella", 0.010),
                  ("humerus", 0.012), ("clavicle", 0.010), ("scapula", 0.022)]:
    v, t = load(key, cell, side="right")
    emit(key, v, t, src(key))

print("Pelvis y tronco")
for key, cell in [("pelvis", 0.02), ("sacrum", 0.02)]:
    v, t = load(key, cell)
    emit(key, v, t, src(key))

# mano derecha: separar cada hueso (componentes conexas)
print("Mano derecha (huesos separados)")
v, t = load("hand", 0.006)
comps = components(v, t)
parts = []
for c in comps:
    pv, pt = subset(v, c)
    if len(pt) < 20:
        continue
    lo, hi = bbox(pv)
    parts.append((pv, pt, lo, hi))
# ordenar: carpo (arriba) a falanges distales (abajo), luego de lateral a medial
parts.sort(key=lambda p: (-round((p[2][1] + p[3][1]) / 2, 1), (p[2][0] + p[3][0]) / 2))
hand_index = []
for i, (pv, pt, lo, hi) in enumerate(parts):
    name = f"hand_{i:02d}"
    emit(name, pv, pt, src("hand"))
    hand_index.append(name)
manifest["hand"] = hand_index

# radio y cúbito: escaneos de donante con orientación propia. Se alinean al
# esqueleto BodyParts3D: extremo proximal bajo el codo, distal sobre el carpo,
# arco del radio hacia lateral y olécranon hacia posterior.
print("Antebrazo (escaneo de donante, alineado al codo y carpo)")


def sub(a, b): return [a[i] - b[i] for i in range(3)]
def add(a, b): return [a[i] + b[i] for i in range(3)]
def mul(a, s): return [x * s for x in a]
def dot(a, b): return sum(a[i] * b[i] for i in range(3))
def cross(a, b): return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
def norm(a): l = math.sqrt(dot(a, a)) or 1.0; return [x / l for x in a]
def perp(v, axis): return norm(sub(v, mul(axis, dot(v, axis))))


def rot_axis_angle(axis, ang):
    x, y, z = norm(axis); c, s = math.cos(ang), math.sin(ang); C = 1 - c
    return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
            [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
            [z * x * C - y * s, z * y * C + x * s, c + z * z * C]]


def mat_vec(m, v): return [dot(m[0], v), dot(m[1], v), dot(m[2], v)]
def mat_mul(a, b): return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def align_rot(src_axis, dst_axis):
    a, b = norm(src_axis), norm(dst_axis)
    ax = cross(a, b)
    if math.sqrt(dot(ax, ax)) < 1e-9:
        return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    return rot_axis_angle(ax, math.acos(max(-1, min(1, dot(a, b)))))


def signed_angle(u, v, axis):
    return math.atan2(dot(cross(u, v), axis), dot(u, v))


def align_bone(verts, prox_is_top, hint_kind, t_prox, t_dist, t_hint):
    ax = [s for s in axis_samples(verts) if s]
    top, bot = ax[-1][:3], ax[0][:3]
    prox, dist = (top, bot) if prox_is_top else (bot, top)
    a_s = norm(sub(prox, dist))
    if hint_kind == "bow":  # arco del radio: desviación del punto medio respecto de la recta
        mid = ax[len(ax) // 2][:3]
        line_mid = mul(add(prox, dist), 0.5)
        hint = perp(sub(mid, line_mid), a_s)
    else:  # olécranon: punto más proximal respecto del centro proximal
        tip = max(verts, key=lambda v: dot(sub(v, dist), a_s))
        hint = perp(sub(tip, prox), a_s)
    a_t = norm(sub(t_prox, t_dist))
    R1 = align_rot(a_s, a_t)
    h1 = perp(mat_vec(R1, hint), a_t)
    R2 = rot_axis_angle(a_t, signed_angle(h1, perp(t_hint, a_t), a_t))
    R = mat_mul(R2, R1)
    # escalar al largo del segmento destino (mismo esqueleto de referencia)
    scale = math.sqrt(dot(sub(t_prox, t_dist), sub(t_prox, t_dist))) / math.sqrt(dot(sub(prox, dist), sub(prox, dist)))
    return [add(t_dist, mul(mat_vec(R, sub(v, dist)), scale)) for v in verts]


ident = lambda p: (p[0] / 100.0, p[2] / 100.0, -p[1] / 100.0)
FOREARM = {
    # (proximal arriba en el archivo, tipo de referencia, destino proximal, destino distal, dirección de referencia)
    # radio: cabeza bajo el cóndilo humeral, estiloides junto al escafoides
    "radius_h": (True, "bow", [-2.25, 10.33, 0.72], [-2.72, 8.06, 1.25], [-1, 0, 0]),
    # cúbito: olécranon por detrás de la tróclea, cabeza a nivel de la fosa semilunar
    "ulna_h": (False, "olecranon", [-1.97, 10.52, 0.58], [-2.42, 8.1, 1.17], [0, 0, -1]),
}
for key, cell in [("radius_h", 0.011), ("ulna_h", 0.011)]:
    v, t = load(key, cell, transform=ident)
    v = align_bone(v, *FOREARM[key])
    emit(key.replace("_h", ""), v, t, src(key))

# contexto: esqueleto "fantasma" (simplificado fuerte)
print("Esqueleto de contexto")
ghost = [("ribcage", 0.05), ("skull", 0.06), ("cervical", 0.04), ("thoracic", 0.04), ("lumbar", 0.04),
         ("sternum", 0.04), ("foot", 0.04)]
for key, cell in ghost:
    if not os.path.exists(os.path.join(SRC, key + ".stl")):
        print("  (falta)", key)
        continue
    v, t = load(key, cell)
    emit("ghost_" + key, v, t, src(key), axis=False)
for key, cell in [("femur", 0.04), ("tibia", 0.04), ("fibula", 0.035), ("humerus", 0.04), ("clavicle", 0.03),
                  ("scapula", 0.05), ("patella", 0.03)]:
    v, t = load(key, cell, side="left")
    emit("ghost_l_" + key, v, t, src(key), axis=False)

json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("OK", len(manifest["bones"]), "modelos")
