# Guía Detallada: Configurar Callback URL en Google Cloud

Esta guía te explica paso a paso dónde pegar la **Callback URL** que copiaste de Supabase para autorizar el inicio de sesión.

## Prerrequisito
Asegúrate de tener copiada la URL de Supabase. Debería verse algo así:
`https://<tu-id-de-proyecto>.supabase.co/auth/v1/callback`
*(La encuentras en Supabase > Authentication > Providers > Google)*

---

## Pasos en Google Cloud Console

1.  **Acceder a la Consola**
    *   Entra a [console.cloud.google.com](https://console.cloud.google.com/).
    *   Asegúrate de tener seleccionado el proyecto correcto en la lista desplegable de la barra superior (junto al logo de Google Cloud).

2.  **Ir a Credenciales**
    *   En el menú de navegación (las 3 rayitas arriba a la izquierda), busca y selecciona **"APIs & Services"** (APIs y Servicios).
    *   En el submenú que aparece, haz clic en **"Credentials"** (Credenciales).

3.  **Localizar tu Cliente OAuth**
    *   En la pantalla principal verás una sección llamada **"OAuth 2.0 Client IDs"**.
    *   Deberías ver un nombre como "Web client 1" o el nombre que le hayas puesto a tu app.
    *   Haz clic en el **icono de lápiz (Editar)** al lado de ese nombre.

4.  **Pegar la URL (La parte clave)**
    *   Baja hasta encontrar la sección **"Authorized redirect URIs"** (URIs de redireccionamiento autorizados).
    *   Haz clic en el botón **"+ ADD URI"** (Agregar URI).
    *   En la casilla que aparece, **PEGA la URL de Supabase** (`.../auth/v1/callback`).
    *   *Nota: No confundir con "Authorized Javascript Origins". Asegúrate de estar en "Authorized redirect URIs".*

5.  **Guardar**
    *   Haz clic en el botón azul **"SAVE"** al final de la página.

---

## Verificación Final
Vuelve a tu aplicación (localhost) e intenta iniciar sesión con Google.
*   Si todo está bien, Google te pedirá elegir tu cuenta y volverás a tu Dashboard como "Admin".
*   Si sale un error de *"redirect_uri_mismatch"*, espera unos minutos (Google puede tardar un poco en actualizar) o verifica que la URL pegada sea *exactamente* idéntica a la que te dio Supabase.
