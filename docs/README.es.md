<div align="center">

<img src="../icon.svg" width="108" alt="dsh-ssh-manager"/>

# dsh-ssh-manager

**Gestiona claves SSH e configuración por host desde la tarjeta de plugins de DeepSeek Harness.**

[![version](https://img.shields.io/badge/version-1.1.0-0071e3)](https://github.com/simonxluo/dsh-ssh-manager/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-34c759)](https://github.com/simonxluo/dsh-ssh-manager/blob/main/LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-%E2%89%A5_0.2.1--rc.1-8957e5)](https://github.com/simonxluo/dsh-ssh-manager)
[![platform](https://img.shields.io/badge/platform-macOS_%7C_Linux-8E8E93)](https://github.com/simonxluo/dsh-ssh-manager)

🇬🇧 [English](../README.md) · 🇨🇳 [简体中文](README.zh.md) · 🇯🇵 [日本語](README.ja.md) · 🇪🇸 **Español**

</div>

---

## Contenido

- [Características](#características)
- [Instalación](#instalación)
- [Inicio rápido](#inicio-rápido)
- [Hoja de ruta](#hoja-de-ruta)
- [Architecture (DAG, en inglés)](../README.md#architecture)
- [Agradecimientos y licencia (en inglés)](../README.md#acknowledgments)

---

Gestiona claves SSH e configuración por host desde la tarjeta de plugins de DSH — los archivos se materializan en `$DSH_HOME/.ssh`, y los agentes pueden hacer `git clone git@host:repo` sin configuración manual.

## Características

- Tarjeta nativa: usa el formulario estándar de 0.2.x; los cambios se aplican en caliente (config volatile), sin reiniciar
- Aislado: todo vive en `$DSH_HOME/.ssh`; la única escritura en `~/.ssh` es una línea `Include` idempotente
- Por host: bloque `Host` (0600), clave privada (0600), pública derivada `.pub` (0644, vía `ssh-keygen -y`)
- **Conexiones con contraseña**: entradas ip / usuario / contraseña con alias opcional (por defecto la IP) y workspace, gestionadas en el panel — la contraseña solo es visible al escribirla la primera vez, luego de solo escritura (almacén local 0600, nunca devuelta por la API); conectividad comprobada por TCP
- **Página de ajustes estilo Apple**: título grande, tarjetas de estadísticas y listas agrupadas con separadores finos; añadir/editar abre una hoja (foco atrapado + Escape), eliminar confirma con un diálogo de alerta — los colores usan exclusivamente tokens de tema `--dsw-alias-*`
- **Info de la máquina (ⓘ)**: el botón de información de cada fila abre una instantánea SSH en vivo — medidores de CPU / memoria / swap / disco (≥ 60% en advertencia, ≥ 85% en error), carga, tiempo activo, SO, kernel y más; los hosts con clave recopilan por su alias gestionado y las conexiones con contraseña usan un ayudante `SSH_ASKPASS` sin secretos (sin sshpass); la contraseña nunca pasa por argv ni por disco
- **Panel integrado**: el gestor también vive como panel principal de un clic junto a la conversación (icono de terminal en la barra lateral), compartiendo el mismo componente que la página de ajustes
- `autoInclude`: inserta una línea `Include` idempotente antes del primer bloque `Host` de `~/.ssh/config` para que `ssh`/`git` resuelvan los hosts
- Autocuración: reconciliación idempotente, limpieza de huérfanos, entradas inválidas omitidas con aviso

## Instalación

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
# o desde un clon local
dsh plugin --profile desktop add /path/to/dsh-ssh-manager
```

## Inicio rápido

Ajustes → Plugins → Configuración de plugins → SSH Manager:

```yaml
hosts:
  github-work:
    url: github.com
    user: git
    privateKey: |
      -----BEGIN OPENSSH PRIVATE KEY-----
      ...
    args: |
      ServerAliveInterval 30
autoInclude: true
```

## Hoja de ruta

- [x] Prueba de conectividad por host (botón de sonda, TCP + handshake SSH)
- [x] UI personalizada (página de ajustes estilo Apple + panel principal integrado)
- [x] Info de máquina en vivo por host (CPU / memoria / disco por SSH)
- [ ] Importación en un clic desde `~/.ssh/config`
- [ ] Generación de claves en la tarjeta (`ed25519`)
- [ ] Gestión de `known_hosts` (`ssh-keyscan`)
- [ ] Herramienta de salud para agentes

---

Los DAG de flujo de control / datos están en [Architecture (en inglés)](../README.md#architecture); agradecimientos y licencia en el [README en inglés](../README.md#acknowledgments).
