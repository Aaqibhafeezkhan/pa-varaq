import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { ZodError } from "zod";
import { hasZodFastifySchemaValidationErrors, jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import type { Config } from "./config";
import type { Db } from "./lib/db";
import { HttpError } from "./lib/errors";
import type { KeyValueStore } from "./lib/redis";
import { authRoutes, createAuthService, createDefaultOtpSender, type OtpSender } from "./modules/auth";
import { catalogRoutes, type MetadataProvider } from "./modules/catalog";
import { createCatalogModule } from "./modules/catalog";
import { circleRoutes, createCirclesModule } from "./modules/circles";
import { circulationRoutes, createCirculationModule } from "./modules/circulation";
import { createPassportModule, passportRoutes } from "./modules/passport";
import { createUsersModule, userRoutes } from "./modules/users";
import { registerAuth } from "./plugins/auth";
import { discoverRoutes } from "./discover.routes";

const SENSITIVE_LOG_FIELDS = [
  "phone",
  "phoneNumber",
  "phone_number",
  "mobile",
  "nationalCode",
  "national_code",
  "nationalId",
  "national_id",
  "birthDate",
  "birth_date",
  "dateOfBirth",
  "date_of_birth",
  "code",
  "otp",
  "otpCode",
  "otp_code",
  "verificationCode",
  "verification_code",
];

const sensitiveLogPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "request.headers.authorization",
  "request.headers.cookie",
  ...SENSITIVE_LOG_FIELDS.flatMap((field) => [
    `req.body.${field}`,
    `req.body.*.${field}`,
    `req.body.*.*.${field}`,
    `request.body.${field}`,
    `request.body.*.${field}`,
    `request.body.*.*.${field}`,
  ]),
];

/** Keep sensitive request data out of structured Fastify/Pino logs. */
export function createLoggerOptions(nodeEnv: Config["NODE_ENV"]) {
  return nodeEnv === "test"
    ? false
    : {
        level: "info" as const,
        redact: { paths: sensitiveLogPaths, censor: "[REDACTED]" },
      };
}

export type AppDeps = {
  config: Config;
  db: Db;
  store: KeyValueStore;
  otpSender?: OtpSender;
  metadata?: MetadataProvider;
};

/** Composition root: wires modules together through their public service interfaces only. */
export async function buildApp({ config, db, store, otpSender, metadata }: AppDeps) {
  const app = Fastify({ logger: createLoggerOptions(config.NODE_ENV) });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: config.CORS_ORIGIN.split(","), methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] });
  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Pa-Varaq API",
        description:
          "Peer-to-peer physical book lending for friends and communities. All error bodies look like `{ error: { code, message } }`.",
        version: "0.1.0",
      },
      components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  await registerAuth(app, config.JWT_SECRET);

  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof HttpError) return reply.code(err.status).send({ error: { code: err.code, message: err.message } });
    if (hasZodFastifySchemaValidationErrors(err) || err instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: err instanceof ZodError ? err.issues : err.validation,
        },
      });
    }
    if (err.statusCode && err.statusCode < 500)
      return reply.code(err.statusCode).send({ error: { code: err.code ?? "BAD_REQUEST", message: err.message } });
    req.log.error(err);
    return reply.code(500).send({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });

  // Modules (dependency order: users, circles -> catalog -> circulation -> passport).
  const users = createUsersModule(db);
  const circles = createCirclesModule(db);
  const catalog = createCatalogModule(db, users, circles, metadata);
  const circulation = createCirculationModule(db, { catalog, users, circles });
  const passport = createPassportModule(db, { catalog, circulation, circles, users });
  const auth = createAuthService({
    config,
    store,
    users,
    circles,
    sender: otpSender ?? createDefaultOtpSender(config.NODE_ENV),
    signToken: (sub) => app.jwt.sign({ sub }),
  });

  app.get("/health", { schema: { tags: ["system"], summary: "Liveness probe" } }, async () => ({ ok: true }));
  await app.register(authRoutes(auth));
  await app.register(userRoutes(users));
  await app.register(circleRoutes(circles));
  await app.register(catalogRoutes(catalog));
  await app.register(circulationRoutes(circulation));
  await app.register(passportRoutes(passport));
  await app.register(discoverRoutes({ catalog, circulation, users }));

  return { app, circulation };
}
