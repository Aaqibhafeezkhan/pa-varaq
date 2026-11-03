import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  approveLoanSchema,
  externalLoanSchema,
  externalReturnSchema,
  handshakeSchema,
  listLoansQuerySchema,
  requestLoanSchema,
  uuidSchema,
} from "@varaq/shared";
import { userId } from "../../plugins/auth";
import type { CirculationService } from "./circulation.service";

export function circulationRoutes(circulation: CirculationService) {
  return async (app: FastifyInstance) => {
    const r = app.withTypeProvider<ZodTypeProvider>();
    const base = { onRequest: [app.authenticate] };
    const tags = ["circulation"];
    const security = [{ bearerAuth: [] }];
    const idParams = z.object({ id: uuidSchema });

    r.get(
      "/loans",
      {
        ...base,
        schema: {
          tags,
          security,
          summary: "My loans (as lender and/or borrower, including external loans)",
          querystring: listLoansQuerySchema,
        },
      },
      (req) => circulation.list(userId(req), req.query),
    );
    r.get("/loans/:id", { ...base, schema: { tags, security, summary: "A loan I take part in", params: idParams } }, (req) =>
      circulation.get(userId(req), req.params.id),
    );
    r.post(
      "/loans",
      { ...base, schema: { tags, security, summary: "Request to borrow a copy (REQUESTED)", body: requestLoanSchema } },
      async (req, reply) => reply.code(201).send(await circulation.requestLoan(userId(req), req.body)),
    );
    r.post(
      "/loans/:id/approve",
      {
        ...base,
        schema: {
          tags,
          security,
          summary: "Lender approves (APPROVED), locks 1 borrower token and generates the handover PIN",
          params: idParams,
          body: approveLoanSchema,
        },
      },
      (req) => circulation.approve(userId(req), req.params.id, req.body),
    );
    r.post(
      "/loans/:id/handover",
      {
        ...base,
        schema: {
          tags,
          security,
          summary: "Borrower enters the lender's 4-digit PIN and logs the book condition (ACTIVE)",
          params: idParams,
          body: handshakeSchema,
        },
      },
      (req) => circulation.handover(userId(req), req.params.id, req.body),
    );
    r.post(
      "/loans/:id/return",
      {
        ...base,
        schema: {
          tags,
          security,
          summary: "Lender enters the borrower's 4-digit PIN and logs the returned condition (RETURNED)",
          params: idParams,
          body: handshakeSchema,
        },
      },
      (req) => circulation.returnBook(userId(req), req.params.id, req.body),
    );
    r.post(
      "/loans/:id/cancel",
      { ...base, schema: { tags, security, summary: "Cancel or decline before handover; refunds a locked token", params: idParams } },
      (req) => circulation.cancel(userId(req), req.params.id),
    );

    r.post(
      "/external-loans",
      { ...base, schema: { tags, security, summary: "Log a book lent to a friend outside Pa-Varaq", body: externalLoanSchema } },
      async (req, reply) => reply.code(201).send(await circulation.createExternal(userId(req), req.body)),
    );
    r.post(
      "/external-loans/:id/return",
      { ...base, schema: { tags, security, summary: "Mark an external loan as returned", params: idParams, body: externalReturnSchema } },
      (req) => circulation.returnExternal(userId(req), req.params.id, req.body.condition),
    );
  };
}
