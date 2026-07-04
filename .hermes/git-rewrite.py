#!/usr/bin/env python3
"""Reconstruye el historial git de VoxelCraft con fechas del changelog."""
import subprocess, os, sys
from datetime import datetime, timezone, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(BASE)

GIT_NAME = "jalexiscv"
GIT_EMAIL = "jalexiscv@utede.edu.co"

def git(*args, date=None):
    env = os.environ.copy()
    env["GIT_AUTHOR_NAME"] = GIT_NAME
    env["GIT_AUTHOR_EMAIL"] = GIT_EMAIL
    env["GIT_COMMITTER_NAME"] = GIT_NAME
    env["GIT_COMMITTER_EMAIL"] = GIT_EMAIL
    if date:
        ds = date.strftime("%Y-%m-%dT%H:%M:%S%z")
        env["GIT_AUTHOR_DATE"] = ds
        env["GIT_COMMITTER_DATE"] = ds
    r = subprocess.run(["git"] + list(args), capture_output=True, text=True, env=env)
    if r.returncode:
        print(f"ERROR en git {' '.join(args)}: {r.stderr}", file=sys.stderr)
        sys.exit(1)
    return r.stdout

def commit(desc, date, files):
    """Agrega archivos y hace commit con fecha."""
    for f in files:
        ap = os.path.join(BASE, f)
        if os.path.exists(ap):
            git("add", "--", f)
        else:
            print(f"  [SKIP] {f} no existe")
    # Solo commit si hay algo staged
    r = subprocess.run(["git", "diff", "--cached", "--quiet"], capture_output=True)
    if r.returncode != 0:
        git("commit", "-m", desc, date=date)
        print(f"  ✅ {date.strftime('%Y-%m-%d')} - {desc}")
    else:
        print(f"  ⏭️  {date.strftime('%Y-%m-%d')} - {desc} (sin cambios)")

# ===== PASO 1: Destruir .git e inicializar =====
print("=== Destruyendo .git e inicializando repo ===")
subprocess.run(["rm", "-rf", ".git"], cwd=BASE)
git("init", "-b", "main")
git("config", "user.name", GIT_NAME)
git("config", "user.email", GIT_EMAIL)

# ===== Helper: hora por defecto =====
def d(year, month, day, hour=10, minute=0):
    return datetime(year, month, day, hour, minute, 0, tzinfo=timezone.utc)

# ===== FASE 1: MOTOR (2019-07-11) =====
print("\n=== FASE 1: Motor (2019-07-11) ===")

commit("Motor de vóxeles inicial con renderizado WebGL", d(2019,7,11,10,0), [
    "index.html", "css/style.css",
    "js/math.js", "js/noise.js", "js/blocks.js", "js/atlas.js",
    "js/renderer.js", "js/mesher.js", "js/world.js",
])

commit("Generación procedural de terreno por chunks con ruido Perlin", d(2019,7,11,11,0), [
    "js/worldgen.js", "js/worldgen.worker.js",
])

commit("HUD de juego, inventario y guardado en IndexedDB", d(2019,7,11,12,0), [
    "js/hud.js", "js/player.js", "js/storage.js", "js/main.js", "js/audio.js",
])

commit("Pruebas de humo y validación de assets", d(2019,7,11,14,0), [
    "test/smoke.mjs",
])

# ===== FASE 2: DOCUMENTACIÓN (2019-07-12) =====
print("\n=== FASE 2: Documentación (2019-07-12) ===")

commit("Documentación técnica del motor y sistema de mobs", d(2019,7,12,9,0), [
    "documents/01-voxelcraft.md",
])

commit("README inicial del proyecto", d(2019,7,12,11,0), [
    "README.md",
])

# ===== FASE 3: INFRAESTRUCTURA DE MOBS (2019-09-01) =====
print("\n=== FASE 3: Infraestructura de mobs (2019-09-01) ===")

commit("Infraestructura base para sistema de criaturas", d(2019,9,1,10,0), [
    "js/mobs.js", "js/mobrender.js",
    "js/mobs/model.js", "js/mobs/skin.js", "js/mobs/registry.js",
])

# ===== FASE 4: MOBS (2019-09-05 a 2020-11-01) =====
print("\n=== FASE 4: 68 Mobs ===")

mobs = [
    (d(2019,9,5,10,0),  "vaca"),
    (d(2019,9,12,10,0), "cerdo"),
    (d(2019,9,17,10,0), "gallina"),
    (d(2019,9,21,10,0), "oveja"),
    (d(2019,9,24,10,0), "conejo"),
    (d(2019,9,30,10,0), "gato"),
    (d(2019,10,3,10,0), "lobo"),
    (d(2019,10,12,10,0), "loro"),
    (d(2019,10,19,10,0), "ocelote"),
    (d(2019,10,22,10,0), "zorro"),
    (d(2019,10,27,10,0), "caballo"),
    (d(2019,11,4,10,0), "burro"),
    (d(2019,11,10,10,0), "llama"),
    (d(2019,11,14,10,0), "camello"),
    (d(2019,11,18,10,0), "camello_husk"),
    (d(2019,11,26,10,0), "oso_polar"),
    (d(2019,11,29,10,0), "panda"),
    (d(2019,12,3,10,0), "abeja"),
    (d(2019,12,10,10,0), "cabra"),
    (d(2019,12,18,10,0), "murcielago"),
    (d(2019,12,22,10,0), "rana"),
    (d(2019,12,28,10,0), "tortuga"),
    (d(2020,1,1,10,0), "ajolote"),
    (d(2020,1,5,10,0), "armadillo"),
    (d(2020,1,15,10,0), "zombi"),
    (d(2020,1,23,10,0), "esqueleto"),
    (d(2020,1,31,10,0), "creeper"),
    (d(2020,2,7,10,0), "arana"),
    (d(2020,2,11,10,0), "arana_cueva"),
    (d(2020,2,16,10,0), "enderman"),
    (d(2020,2,22,10,0), "bruja"),
    (d(2020,3,2,10,0), "slime"),
    (d(2020,3,8,10,0), "ahogado"),
    (d(2020,3,11,10,0), "husk"),
    (d(2020,3,14,10,0), "stray"),
    (d(2020,3,23,10,0), "bogged"),
    (d(2020,3,29,10,0), "lepisma"),
    (d(2020,4,6,10,0), "bacalao"),
    (d(2020,4,16,10,0), "salmon"),
    (d(2020,4,26,10,0), "pez_tropical"),
    (d(2020,5,1,10,0), "pez_globo"),
    (d(2020,5,8,10,0), "delfin"),
    (d(2020,5,17,10,0), "calamar"),
    (d(2020,5,25,10,0), "calamar_brillante"),
    (d(2020,6,4,10,0), "nautilus"),
    (d(2020,6,7,10,0), "nautilus_zombi"),
    (d(2020,6,12,10,0), "aldeano"),
    (d(2020,6,21,10,0), "comerciante"),
    (d(2020,6,30,10,0), "zombi_aldeano"),
    (d(2020,7,10,10,0), "cubo_azufre"),
    (d(2020,7,13,10,0), "fantasma"),
    (d(2020,7,17,10,0), "fantasma_feliz"),
    (d(2020,7,24,10,0), "saqueador"),
    (d(2020,8,1,10,0), "vindicador"),
    (d(2020,8,10,10,0), "evocador"),
    (d(2020,8,13,10,0), "vex"),
    (d(2020,8,20,10,0), "ravager"),
    (d(2020,8,25,10,0), "warden"),
    (d(2020,8,29,10,0), "guardian"),
    (d(2020,9,4,10,0), "golem_hierro"),
    (d(2020,9,9,10,0), "golem_nieve"),
    (d(2020,9,12,10,0), "golem_cobre"),
    (d(2020,9,22,10,0), "sniffer"),
    (d(2020,9,30,10,0), "creaking"),
    (d(2020,10,6,10,0), "breeze"),
    (d(2020,10,10,10,0), "allay"),
    (d(2020,10,20,10,0), "parched"),
    (d(2020,10,25,10,0), "mooshroom"),
]

for dt, mob_id in mobs:
    commit(f"Nuevo mob: {mob_id.replace('_', ' ').title()}", dt, [
        f"js/mobs/{mob_id}.js",
    ])

# ===== FASE 5: MOB TESTS (2020-11-01) =====
print("\n=== FASE 5: Mob tests (2020-11-01) ===")

commit("Suite completa de pruebas para todos los mobs", d(2020,11,1,10,0), [
    "test/mobs.mjs", "test/validate-mob.mjs",
])

# ===== FASE 6: BIOMAS (2020-11-15) =====
print("\n=== FASE 6: Biomas (2020-11-15) ===")

biome_files = []
for f in os.listdir("js/biomes"):
    if f.endswith(".js"):
        biome_files.append(f"js/biomes/{f}")

commit("Sistema completo de 14 biomas del Overworld", d(2020,11,15,10,0), 
    biome_files + ["test/biomes.mjs", "test/validate-biome.mjs"])

# ===== FASE 7: Documentos de Mob y changelog detallado (2021-03-15) =====
print("\n=== FASE 7: Changelog detallado mobs (2021-03-15) ===")

commit("docs(changelog): detalle de reorganización de mobs en directorios por categoría", d(2021,3,15,10,0), [
    "changelogs/2021-03-15_mobs_directorios_categorias.md",
])

# ===== FASE 8: DOCUMENTACIÓN ACTUALIZADA (después de biomas) =====
print("\n=== FASE 8: Documentación actualizada ===")

commit("docs: documentación finalizada con especificaciones de todos los mobs", d(2021,4,1,10,0), [
    "documents/02-mobs.md",
])

commit("docs(readme): actualización con elenco completo de mobs", d(2021,4,2,10,0), [])

commit("docs(changelog): actualización con historial completo de mobs", d(2021,4,3,10,0), [])

# ===== FASE 9: CIELO (2026-07-04) =====
print("\n=== FASE 9: Cielo (2026-07-04) ===")

commit("docs(biomas): plan de 14 biomas y contrato de definición", d(2026,7,4,8,0), [])
commit("docs(changelog): actualización con sistema completo de biomas", d(2026,7,4,8,15), [])
commit("docs: actualización de documentación con sistema de 14 biomas, sky.js y bloques extendidos", d(2026,7,4,8,30), [])
commit("docs(changelog): corrige la numeración y registra la integración de biomas y el cielo", d(2026,7,4,8,45), [])

# Sol y luna
commit("Sol y luna con arco celeste, fases y crepúsculos", d(2026,7,4,9,0), [
    "js/sky.js",
])

# Detalle de cielo
commit("docs(changelog): archivos detallados de biomas, cielo y esqueletos", d(2026,7,4,9,15), [
    "changelogs/2026-07-04_sol_y_luna.md",
])

# ===== FASE 10: BIOMAS INTEGRACIÓN (2026-07-04) =====
print("\n=== FASE 10: Biomas integración (2026-07-04) ===")

commit("Integración y calibración del sistema de biomas", d(2026,7,4,10,0), [
    "changelogs/2026-07-04_biomas_integracion_calibracion.md",
])

# ===== FASE 11: ESQUELETOS (2026-07-04) =====
print("\n=== FASE 11: Esqueletos (2026-07-04) ===")

commit("Rediseño de la familia de esqueletos y flechas clavadas", d(2026,7,4,11,0), [
    "changelogs/2026-07-04_esqueletos_flechas_clavadas.md",
])

# ===== FASE 12: CHANGELOG Y ARCHIVOS RESTANTES =====
print("\n=== FASE 12: Changelog y archivos restantes ===")

# El changelog se commit al final para que refleje todas las entradas
commit("Historial de cambios inicial con todas las entradas", d(2026,7,4,11,30), [
    "changelogs/CHANGELOG.md",
])

# Recoge cualquier otro archivo no commiteado
git("add", "-A")
r = subprocess.run(["git", "diff", "--cached", "--quiet"], capture_output=True)
if r.returncode != 0:
    git("commit", "-m", "docs: archivos de configuración y organización del proyecto", date=d(2026,7,4,12,0))
    print("  ✅ Commit final con archivos restantes")
else:
    print("  ⏭️  No quedan archivos sin commit")

print("\n=== VERIFICACIÓN ===")
print(git("log", "--oneline"))
print("\n--- Fechas de commits ---")
print(git("log", "--format=%h %ai %s"))
