# appai

Monorepo moderno con Bun Workspaces que incluye:

- Cliente React + Vite + TypeScript
- Servidor Express 5 + TypeScript (ejecutado con Bun)
- Configuración mínima, arranque rápido y DX cuidada

## Requisitos

- Bun ≥ 1.2 (instalación: `curl -fsSL https://bun.sh/install | bash`)
- Git Bash/Terminal con soporte para scripts (en Windows, Git Bash funciona bien)

## Estructura del proyecto

```text
appai/
├─ index.ts                 # Script de ejemplo en raíz (Bun)
├─ package.json             # Workspaces de Bun
├─ tsconfig.json
├─ packages/
│  ├─ client/               # Frontend React + Vite
│  │  ├─ src/
│  │  │  └─ ...
│  │  ├─ package.json
│  │  └─ vite.config.ts
│  └─ server/               # Backend Express 5
│     ├─ index.ts           # Endpoints básicos y bootstrap
│     └─ package.json
└─ README.md
```

## Tecnologías clave

- Bun (runtime, gestor de paquetes y bundler)
- TypeScript 5
- React 19 + Vite 7
- Express 5 + dotenv
- ESLint 9

## Instalación

Desde la raíz del monorepo:

```bash
bun install
```

Esto instalará dependencias en la raíz y en cada workspace bajo `packages/*`.

## Scripts útiles

### Comandos de raíz

- Ejecutar el script de ejemplo:

```bash
bun run index.ts
```

> Consejo: puedes usar `bun --filter <paquete> run <script>` para ejecutar scripts dentro de un workspace desde la raíz.

### Cliente (React + Vite)

Entrar al workspace y ejecutar Vite en modo desarrollo:

```bash
cd packages/client
bun run dev
```

Otros scripts disponibles:

```bash
# Build de producción
bun run build

# Preview del build
bun run preview

# Linter
bun run lint
```

### Servidor (Express 5)

Entrar al workspace y levantar el servidor:

```bash
cd packages/server

# Desarrollo con watch
bun run dev

# Producción
bun run start
```

Variables de entorno soportadas (a través de `dotenv`):

- `PORT` (por defecto 3000)

Endpoints incluidos por defecto:

```http
GET /
GET /api/hello
```

## Flujo de desarrollo recomendado

1. Instalar dependencias en la raíz: `bun install`.
2. Abrir dos terminales:
   - Terminal A: `cd packages/server && bun run dev`
   - Terminal B: `cd packages/client && bun run dev`
3. Cliente disponible en `http://localhost:5173` (puerto por defecto de Vite).
4. Servidor expuesto en `http://localhost:3000` (o el puerto definido por `PORT`).

## Configuración de TypeScript/ESLint

- El cliente define `tsconfig` y ESLint con reglas modernas para React 19.
- El servidor usa tipos de `express` y `bun`.
- Ejecuta `bun run lint` dentro de `packages/client` para revisar el frontend.

## Despliegue

- Cliente: generar artefactos con `bun run build` en `packages/client` y servir los archivos estáticos resultantes (`dist/`).
- Servidor: usar `bun run start` en `packages/server` dentro del entorno de ejecución (configurar `PORT`).

## Notas

- Bun permite tiempos de arranque y de instalación muy rápidos.
- En Windows, se recomienda usar Git Bash o WSL para una mejor compatibilidad de CLI.

---

Hecho con Bun, React y Express.
