# dsh-ssh-manager

`v1.0.1` · MIT · DeepSeek Harness ≥ 0.2.1-rc.1

[English](../README.md) | [简体中文](README.zh.md) | [日本語](README.ja.md) | **Español** | [Architecture (DAG)](../README.md#architecture)

---

Gestiona claves SSH e configuración por host desde la tarjeta de plugins de DSH — los archivos se materializan en `$DSH_HOME/.ssh`, y los agentes pueden hacer `git clone git@host:repo` sin configuración manual.

**Características**

- Tarjeta nativa: usa el formulario estándar de 0.2.x; los cambios se aplican en caliente (config volatile), sin reiniciar
- Aislado: todo vive en `$DSH_HOME/.ssh`; la única escritura en `~/.ssh` es una línea `Include` idempotente
- Por host: bloque `Host` (0600), clave privada (0600), pública derivada `.pub` (0644, vía `ssh-keygen -y`)
- **Conexiones con contraseña**: entradas ip / usuario / contraseña con alias opcional (por defecto la IP) y workspace, gestionadas en el panel — la contraseña solo es visible al escribirla la primera vez, luego de solo escritura (almacén local 0600, nunca devuelta por la API); conectividad comprobada por TCP
- **Página de ajustes estilo Apple**: título grande, tarjetas de estadísticas y listas agrupadas con separadores finos; añadir/editar abre una hoja (foco atrapado + Escape), eliminar confirma con un diálogo de alerta — los colores usan exclusivamente tokens de tema `--dsw-alias-*`
- `autoInclude`: inserta una línea `Include` idempotente antes del primer bloque `Host` de `~/.ssh/config` para que `ssh`/`git` resuelvan los hosts
- Autocuración: reconciliación idempotente, limpieza de huérfanos, entradas inválidas omitidas con aviso

**Instalación**

```bash
dsh plugin --profile desktop add simonxluo/dsh-ssh-manager
# o desde un clon local
dsh plugin --profile desktop add /path/to/dsh-ssh-manager
```

**Inicio rápido** — Ajustes → Plugins → Configuración de plugins → SSH Manager:

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

**Hoja de ruta**

- Importación en un clic desde `~/.ssh/config`
- Generación de claves en la tarjeta (`ed25519`)
- Prueba de conectividad por host (`ssh -G` / handshake)
- Gestión de `known_hosts` (`ssh-keyscan`)
- Herramienta de salud para agentes

---

Los DAG de flujo de control / datos están en [Architecture (DAG)](../README.md#architecture); agradecimientos y licencia en el [README en inglés](../README.md#acknowledgments).
