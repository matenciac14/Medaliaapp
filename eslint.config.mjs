import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // ── Architectural boundary: domain layer must NOT import from infra or DB ──
  // The domain is pure business logic — it must not know about Prisma,
  // Next.js, or any infrastructure detail.
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Blocks: @prisma/client, generated/prisma, lib/db/prisma (singleton)
              // Allows: lib/db/prisma-client (only the PrismaDbClient type used for DI)
              group: ["@prisma/client", "**/generated/prisma*", "**/lib/db/prisma", "**/lib/db/prisma/"],
              message:
                "Domain layer must not import Prisma directly. Use a repository port (src/domain/ports/) and inject it via the use case's deps parameter.",
            },
            {
              group: ["next/*", "next-auth*", "@auth/*"],
              message:
                "Domain layer must not import Next.js or Auth.js. Move HTTP/auth concerns to src/app/api/ routes.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
