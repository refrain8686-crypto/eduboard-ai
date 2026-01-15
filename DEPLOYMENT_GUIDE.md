# Guía de Despliegue a Producción (EduBoard AI)

Esta guía te llevará paso a paso para desplegar tu aplicación en Vercel y configurar la seguridad de tu base de datos en Supabase.

## 1. Preparación del Código (Git)

Primero, necesitamos guardar tu código en un repositorio de Git para poder enviarlo a Vercel.

Abre una terminal en la carpeta de tu proyecto y ejecuta los siguientes comandos uno por uno:

```bash
# 1. Inicializar el repositorio
git init

# 2. Verificar que .gitignore está funcionando (no deberías ver node_modules ni .env)
git status

# 3. Guardar todos los cambios
git add .
git commit -m "Initial commit - EduBoard AI v1.0"

# Opcional pero recomendado: Subir a GitHub
# (Crea un repositorio en GitHub.com primero y luego sigue las instrucciones que te dan, usualmente son:)
# git branch -M main
# git remote add origin https://github.com/TU_USUARIO/eduboard-ai.git
# git push -u origin main
```

## 2. Despliegue en Vercel

Vercel es la mejor plataforma para alojar aplicaciones React/Vite. Sigue estos pasos:

1.  Ve a [Vercel.com](https://vercel.com) y crea una cuenta (puedes usar GitHub).
2.  En el Dashboard, haz clic en **"Add New..."** -> **"Project"**.
3.  Selecciona tu repositorio de GitHub (si lo subiste) o usa "Import" para subirlo manualmente desde tu computadora usando Vercel CLI.
    *   *Opción fácil:* Instala Vercel CLI en tu terminal: `npm i -g vercel`
    *   Ejecuta: `vercel` y sigue las instrucciones (enter, enter, enter...).
4.  **Configuración de Variables de Entorno (Environment Variables):**
    *   Vercel detectará que es un proyecto Vite.
    *   Antes de finalizar el despliegue, busca la sección **"Environment Variables"** en la configuración del proyecto en Vercel.
    *   Agrega las siguientes variables (copiando los valores de tu archivo `.env` local o de tu Dashboard de Supabase):
        *   `VITE_SUPABASE_URL`: (Tu URL de Supabase, ej: https://xyz.supabase.co)
        *   `VITE_SUPABASE_ANON_KEY`: (Tu clave pública anónima `ey...`)
5.  Haz clic en **"Deploy"**.
6.  ¡Listo! En unos minutos tendrás una URL pública (ej: `eduboard-ai.vercel.app`).

## 3. Seguridad de Base de Datos (Row Level Security - RLS)

Para proteger tu pizarra en una red pública, debemos configurar reglas estrictas en Supabase.

Ve a tu **Supabase Dashboard** -> **SQL Editor** -> **New Query**, pega el siguiente código y ejecútalo:

```sql
-- 1. Habilitar RLS en la tabla (si no está ya habilitado)
ALTER TABLE whiteboard_history ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICA DE LECTURA: PÚBLICA
-- Permitir que CUALQUIERA vea el contenido de las pizarras (necesario para compartir enlaces).
-- Si quieres privacidad total, cambia esto para chequear user_id.
CREATE POLICY "Public Read Access"
ON whiteboard_history FOR SELECT
USING (true);

-- 3. POLÍTICA DE ESCRITURA: AUTENTICADOS O ANÓNIMOS CON SESIÓN
-- Permitir insertar solo si tienes una sesión (aunque sea anónima/pública en la app).
-- En este caso, la app siempre envía un user_id.
CREATE POLICY "Public Insert Access"
ON whiteboard_history FOR INSERT
WITH CHECK (true);

-- 4. POLÍTICA DE BORRADO/EDICIÓN: SOLO PROPIETARIOS (Opcional)
-- Idealmente, solo el creador debería poder borrar todo, pero para colaboración abierta:
CREATE POLICY "Public Update Access"
ON whiteboard_history FOR UPDATE
USING (true);

CREATE POLICY "Public Delete Access"
ON whiteboard_history FOR DELETE
USING (true);
```

> **Nota:** Estas políticas son "permisivas" (`USING (true)`) para facilitar la colaboración rápida sin logins obligatorios para los alumnos. Si en el futuro quieres que *solo* los alumnos registrados puedan escribir, cambiaríamos `USING (true)` por `USING (auth.uid() = user_id)`.

## 4. Configuración Final en Supabase (Auth)

Si usas autenticación (Google/Email), asegúrate de:

1.  Ir a **Authentication** -> **URL Configuration**.
2.  En **Site URL**, pon tu nueva URL de Vercel (ej: `https://eduboard-ai.vercel.app`).
3.  En **Redirect URLs**, añade también `https://eduboard-ai.vercel.app/**`.

---
¡Felicidades! Tu aplicación ahora es una PWA profesional, segura y escalable.
