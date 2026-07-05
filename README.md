# VoxelCraft

**VoxelCraft** (v0.5.0) es un juego de vóxeles de **mundo infinito escrito desde cero**: módulos ES vanilla sin build, sin backend y sin dependencias, con **assets 100 % procedurales** (texturas y pieles pintadas píxel a píxel, sonido y voces sintetizados con WebAudio). Incluye generación procedural de terreno por chunks, ciclo día/noche, 68 mobs con IA, combate, salud y guardado en IndexedDB.

## Ejecución

*   **URL de pruebas:** http://minecraft.local/ (virtual host de XAMPP apuntando a esta carpeta).
*   Requiere navegador con **WebGL 2**. Sin instalación: es una aplicación estática.
*   Controles en el menú del juego (botón «Controles»).

## Estructura

```
Minecraft/
├── index.html              <-- Punto de entrada
├── css/                    <-- Estilos del HUD
├── js/                     <-- Motor propio (módulos ES; mobs en js/mobs/)
├── test/                   <-- Suites (node test/smoke.mjs y node test/mobs.mjs)
├── example/ y assets/      <-- Material archivado de terceros: solo referencia,
│                               no forma parte de VoxelCraft y no se modifica
├── README.md               <-- Este archivo
├── documents/              <-- Documentación técnica (índice abajo)
└── changelogs/             <-- Historial de cambios
```

## Documentación

| # | Documento | Contenido |
|---|---|---|
| 01 | [VoxelCraft](documents/01-voxelcraft.md) | Arquitectura del motor, decisiones técnicas, verificación |
| 02 | [Sistema de mobs](documents/02-mobs.md) | Elenco de 68 mobs: contrato, IA, hábitats, salud del jugador |
| 03 | [Sistema de biomas](documents/03-biomas.md) | 14 biomas: clima, materiales, vegetación y mobs por bioma |
| 04 | [Items y drops](documents/04-items.md) | Botín de los mobs, horno y fundición, herramientas, bloques funcionales, agricultura |
| 05 | [Aldeas](documents/05-aldeas.md) | Generación procedural de aldeas: algoritmo por celdas, 8 arquetipos, paletas por bioma |

## Historial de cambios

Ver [changelogs/CHANGELOG.md](changelogs/CHANGELOG.md).

## Nota legal

**VoxelCraft es código propio** con assets generados por código: no contiene material de terceros. Las carpetas `example/` y `assets/` conservan material archivado de terceros ajeno al juego; no debe redistribuirse.

---

## 💡 Contribución

Este proyecto es **Open Source** y vive gracias a la comunidad. ¡Tus contribuciones son bienvenidas!

### Cómo Contribuir

1. **Fork** del repositorio
2. **Crea tu rama** de característica
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
3. **Asegúrate de ejecutar los tests**
   ```bash
   node test/smoke.mjs
   ```
4. **Haz commit de tus cambios**
   ```bash
   git commit -m 'feat: nueva funcionalidad increíble'
   ```
5. **Push a tu rama**
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
6. **Abre un Pull Request**

### Directrices de Contribución

- ✅ Sigue los estándares ES module y buenas prácticas JavaScript
- ✅ Usa nombres descriptivos para variables y funciones (español)
- ✅ Documenta las funciones públicas con JSDoc
- ✅ Agrega tests para nuevas funcionalidades en `test/`
- ✅ Actualiza la documentación relevante en `documents/`

### Áreas que Necesitan Ayuda

- 🧪 Tests unitarios y de integración para mobs
- 🐛 Reportes de bugs en la IA de los mobs
- 📖 Mejoras en documentación técnica
- 🌍 Traducciones de la interfaz
- 🎨 Nuevas texturas procedurales

---

## 🆘 Soporte y Comunidad

### ¿Necesitas Ayuda?

- 📖 **Documentación**: Lee los archivos en [documents/](documents/)
- 🐛 **Reportar bugs**: Abre un [issue en GitHub](https://github.com/jalexiscv/Voxelcraft/issues)
- 💡 **Solicitar funcionalidades**: Usa las [GitHub Discussions](https://github.com/jalexiscv/Voxelcraft/discussions)
- ✉️ **Contacto directo**: jalexiscv@gmail.com

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Ver [LICENSE](LICENSE) para más información.

> La licencia MIT te permite usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y/o vender copias del software sin restricciones, siempre que se incluya el aviso de copyright.

---

## 👨‍💻 Autor

**Jose Alexis Correa Valencia** — *Full Stack Developer & Software Architect*

Con más de 25 años de experiencia en desarrollo de software empresarial, especializado en arquitecturas escalables y soluciones web modernas.

- **GitHub**: [@jalexiscv](https://github.com/jalexiscv)
- **LinkedIn**: [Jose Alexis Correa Valencia](https://www.linkedin.com/in/jalexiscv/)
- **Email**: jalexiscv@gmail.com
- **Ubicación**: Colombia 🇨🇴
