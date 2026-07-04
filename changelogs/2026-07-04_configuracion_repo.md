# Configuración del repositorio y análisis del proyecto

**Fecha:** 2026-07-04
**Módulo:** VoxelCraft > Repositorio

## Descripción

Commit de organización del repositorio: configuración de git, herramienta
interna de curación del historial y documento de análisis del proyecto.
(El mismo commit arrastró archivos de las funcionalidades en curso, ya
registrados en sus entradas: 85 menú/modos, 86 inventario y el plan de
biomas.)

## Tipo de Cambio

- `Agregado`

## Archivos Afectados

### [NUEVO] `.gitignore`, `.gitattributes`
- Exclusiones del repositorio (material archivado de terceros, protocolos
  internos, sistema operativo) y atributos de git.

### [NUEVO] `.hermes/git-rewrite.py`
- Herramienta interna para la curación del historial de commits.

### [NUEVO] `ANALISIS.md`
- Análisis general del proyecto en la raíz del repositorio.

## Impacto

- Organización del repositorio; sin efecto en el juego ni en las suites.
