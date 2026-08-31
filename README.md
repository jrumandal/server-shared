# `@server/shared` — Shared Server Library

Shared NestJS building blocks for the micro-frontend **backend** services. This
repo is the **foundation** of the backend dependency graph: it is built and
published first, and the API gateway plus the catalog / cart / user services all
depend on it.

It bundles the cross-cutting concerns every service needs so each service stays
small and focused on its domain:

| Concern | Export |
| --- | --- |
| Typed env config | `AppConfigModule`, `AppConfig` |
| Prisma lifecycle | `PrismaModule`, `PrismaService` |
| Health checks | `HealthModule`, `HealthController` |
| Request logging | `LoggingInterceptor` |
| Error handling | `AllExceptionsFilter` |
| Prisma schema + migrations | `prisma/` (schema, seed, migrations) |

> **Status:** Faithful port of the reference `libs/server/shared` package,
> re-homed as a standalone, independently versioned repository.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node 22 LTS, CommonJS |
| Framework | NestJS 11 (`@nestjs/common`, `@nestjs/config`, `@nestjs/terminus`) |
| ORM | Prisma 6 (`@prisma/client`) |
| Build | `tsc` → `dist/` (CommonJS + `.d.ts`) |
| Tests | Jest + ts-jest |
| Lint | ESLint 9 (flat) + typescript-eslint |
| Types | TypeScript 5.9 |

## Repository layout

```
server-shared/
├── .github/workflows/ci.yml   # lint → typecheck → test → build → publish
├── .npmrc                     # @server → GitHub Packages
├── .nvmrc                     # Node 22
├── eslint.config.mjs          # flat ESLint 9 config
├── jest.config.cts            # Jest + ts-jest
├── package.json               # @server/shared (private)
├── prisma/                    # schema.prisma, seed.mjs, migrations/
├── src/
│   ├── index.ts               # public API
│   └── lib/
│       ├── shared.module.ts
│       ├── config/            # AppConfigModule + configuration factory
│       ├── prisma/            # PrismaModule + PrismaService
│       ├── health/            # HealthController + HealthModule
│       ├── logging/           # LoggingInterceptor
│       └── errors/            # AllExceptionsFilter
├── test/                      # Jest specs
├── tsconfig.json
├── tsconfig.build.json
└── tsconfig.spec.json
```

## Toolchain (pinned)

| Tool | Version |
| --- | --- |
| Node | 22 LTS |
| pnpm | 11.24.0 |
| TypeScript | 5.9.x |
| ESLint | 9.39.5 |
| NestJS | 11.x |
| Prisma | 6.x |

## Local development

```bash
nvm use            # Node 22
pnpm install
pnpm prisma:generate   # generate the Prisma client from prisma/schema.prisma
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Publishing

Publishing is automated: on every push to `main`, after CI is green, the
`publish` job builds the package and publishes `@server/shared` to
**GitHub Packages** (see `.npmrc`). The gateway and the three services resolve
it from that registry.

> **Note:** GitHub Packages requires a `NPM_TOKEN` secret with the
> `write:packages` scope. On a free GitHub account the `publish` job may be
> denied (`403 create_package`); the `ci` job (lint / typecheck / test / build)
> is the source of truth for correctness.
