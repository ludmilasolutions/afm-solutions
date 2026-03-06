# TECNIYA - AFM Solutions

Plataforma web tipo PedidosYa para profesionales y técnicos de oficios.

## Características

- **Búsqueda de profesionales** por provincia, ciudad, especialidad
- **Filtros avanzados**: certificados, destacados, disponibles ahora
- **Sistema de trabajos**: solicitud, aceptación, seguimiento
- **Reseñas y puntuaciones**: puntualidad, calidad, precio, comunicación
- **Profesionales destacados**: suscripción mensual
- **Presupuestos PDF**: para profesionales destacados
- **Panel de usuario**: trabajos, favoritos, direcciones
- **Panel de profesional**: gestión de solicitudes, galería, certificaciones
- **Panel de administración**: gestión completa de la plataforma
- **PWA**: instalable como aplicación

## Estructura del Proyecto

```
afmcontecniya/
├── tecniya.html          # Página principal
├── tecniya-supabase-schema.sql  # Schema de base de datos
├── manifest.json         # Manifiesto PWA
├── sw.js               # Service Worker
├── css/
│   └── styles.css     # Estilos principales
├── js/
│   └── app.js         # Lógica de la aplicación
├── admin/
│   └── index.html     # Panel de administración
├── professional/
│   └── index.html     # Panel de profesionales
├── assets/            # Imágenes y recursos
└── icons/             # Iconos PWA
```

## Configuración

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que se aprovisione

### 2. Ejecutar el Schema

1. En el panel de Supabase, ve a **SQL Editor**
2. Copia el contenido de `tecniya-supabase-schema.sql`
3. Ejecuta el script

### 3. Configurar autenticación

1. En Supabase, ve a **Authentication > Providers**
2. Habilita **Email** (para registro con email/contraseña)
3. Habilita **Google** (opcional, para login con Google)
   - Necesitas configurar OAuth en Google Cloud Console

### 4. Actualizar credenciales

Edita `js/app.js` y cambia:

```javascript
const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_KEY = 'tu-anon-key';
```

Lo mismo en `admin/index.html` y `professional/index.html`

### 5. Configurar Storage

1. En Supabase, ve a **Storage**
2. Crea los siguientes buckets:
   - `avatars` - Avatares de usuarios
   - `profiles` - Fotos de profesionales
   - `certifications` - Certificaciones
   - `work-photos` - Fotos de trabajos
   - `ads` - Publicidades

### 6. Políticas RLS

Las políticas RLS ya están incluidas en el schema SQL.

## Ejecutar localmente

Puedes usar cualquier servidor web estático:

### Con Python
```bash
python -m http.server 8000
```

### Con Node.js
```bash
npx serve .
```

### Con PHP
```bash
php -S localhost:8000
```

## Roles de usuario

- **user**: Usuario común que busca profesionales
- **professional**: Profesional que ofrece servicios
- **admin**: Administrador de la plataforma

## Funcionalidades por rol

### Usuario
- Buscar profesionales
- Solicitar trabajos
- Calificar profesionales
- Guardar favoritos
- Guardar direcciones
- Recibir presupuestos

### Profesional
- Crear perfil
- Recibir solicitudes
- Aceptar/trabajos
- Subir certificaciones
- Subir fotos de trabajos
- Crear presupuestos (destacados)
- Suscribirse como destacado

### Administrador
- Gestionar usuarios
- Aprobar profesionales destacados
- Gestionar publicidad
- Moderar reseñas
- Ver estadísticas

## Suscripción de profesionales destacados

Precio: $5.000/mes

Beneficios:
- Mayor visibilidad en búsquedas
- Badge destacado
- Crear presupuestos PDF
- Enviar por WhatsApp

## PWA

La app es instalable como aplicación nativa:
- En Chrome para Android: "Instalar aplicación" en el menú
- En Safari para iOS: "Agregar a pantalla de inicio"

## Tecnologías usadas

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **PWA**: Service Worker, Manifest

## Próximas características

- Chat en tiempo real
- Notificaciones push
- Sistema de pagos
- geolocalización avanzada
- Chatbot de atención al cliente
- App nativa (React Native/Flutter)

## Licencia

Copyright © 2024 AFM Solutions. Todos los derechos reservados.
