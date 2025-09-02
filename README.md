# TodoFru - Sistema de Gestión Empresarial

TodoFru es una aplicación web para la gestión empresarial de negocios de frutas y verduras, que incluye módulos para gestión de clientes, inventarios, facturación y cuentas por cobrar.

## Características

- **Sistema de autenticación**: Login seguro con roles de usuario
- **Gestión de clientes**: Registro y administración de clientes
- **Control de inventarios**: Gestión de productos y existencias
- **Facturación**: Creación y gestión de facturas
- **Cuentas por cobrar**: Seguimiento de pagos pendientes

## Tecnologías utilizadas

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- NextAuth.js para autenticación
- Prisma ORM
- PostgreSQL
- Zustand para gestión de estado

## Requisitos previos

- Node.js 18.0 o superior
- PostgreSQL

## Configuración inicial

1. Instala las dependencias:

```bash
npm install
```

2. Configura las variables de entorno:

Asegúrate de que el archivo `.env` en la raíz del proyecto tenga el siguiente contenido:

```
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/todofru?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secreto-seguro"
```

Asegúrate de reemplazar `usuario`, `contraseña` y `tu-secreto-seguro` con tus propios valores.

3. Configura la base de datos:

```bash
npm run setup-db
```

Este comando ejecutará las migraciones de Prisma y creará un usuario administrador inicial:

- Email: admin@todofru.com
- Contraseña: admin123

## Ejecución del proyecto

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto

```
/src
  /app                    # Rutas y páginas de la aplicación
    /(auth)               # Rutas de autenticación
    /(dashboard)          # Rutas del panel de control
    /api                  # API routes
  /components             # Componentes reutilizables
    /auth                 # Componentes de autenticación
    /dashboard            # Componentes del panel de control
    /ui                   # Componentes de UI genéricos
  /hooks                  # Custom hooks
  /lib                    # Utilidades y configuraciones
  /types                  # Definiciones de tipos
  /utils                  # Funciones de utilidad
/prisma                   # Esquema y migraciones de Prisma
```

## Licencia

Este proyecto está bajo la Licencia MIT.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
