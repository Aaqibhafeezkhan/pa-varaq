import type { BookCondition } from "@prisma/client";
import { DEFAULT_LOAN_DAYS, MAX_PIN_ATTEMPTS, PIN_LENGTH } from "@varaq/shared";
import { isUniqueViolation } from "../../lib/db";
import { HttpError, badRequest, conflict, forbidden, notFound } from "../../lib/errors";
import { randomDigits, safeEqual } from "../../lib/hash";
import type { CatalogService } from "../catalog";
import type { CirclesService } from "../circles";
import type { UsersService } from "../users";
import {
  ForbiddenActorError,
  InvalidTransitionError,
  actorOf,
  settle,
  transition,
  type LoanActor,
  type LoanEvent,
} from "./loan-state-machine";
import type { LoanRepository, LoanRow } from "./loan.repository";

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);

/**
 * Serializes a loan for one viewer. A PIN is only revealed to the party who must *show* it:
 * the lender shows the handover PIN, the borrower shows the return PIN.
 */
export function toLoanDto(loan: LoanRow, viewerId: string) {
  const role = actorOf(loan, viewerId);
  const pin =
    role === "LENDER" && loan.state === "APPROVED"
      ? loan.handoverPin
      : role === "BORROWER" && (loan.state === "ACTIVE" || loan.state === "OVERDUE")
        ? loan.returnPin
        : null;
  return {
    id: loan.id,
    state: loan.state,
    isExternal: loan.borrowerId === null,
    myRole: role === "LENDER" ? ("lender" as const) : role === "BORROWER" ? ("borrower" as const) : null,
    copy: {
      id: loan.copy.id,
      title: loan.copy.edition.title,
      authors: loan.copy.edition.authors,
      coverUrl: loan.copy.edition.coverUrl,
      isbn: loan.copy.edition.isbn,
    },
    lender: loan.lender,
    borrower: loan.borrower,
    externalBorrowerName: loan.externalBorrowerName,
    dueDate: loan.dueDate,
    handoverCondition: loan.handoverCondition,
    returnCondition: loan.returnCondition,
    createdAt: loan.createdAt,
    handoverAt: loan.handoverAt,
    returnedAt: loan.returnedAt,
    pin,
    pinLocked: loan.pinAttempts >= MAX_PIN_ATTEMPTS,
  };
}
export type LoanDto = ReturnType<typeof toLoanDto>;

export type CirculationService = ReturnType<typeof createCirculationService>;

export function createCirculationService(deps: {
  repo: LoanRepository;
  catalog: CatalogService;
  users: UsersService;
  circles: CirclesService;
}) {
  const { repo, catalog, users, circles } = deps;

  async function load(id: string, tx?: Parameters<typeof repo.find>[1]) {
    const loan = await repo.find(id, tx);
    if (!loan) throw notFound("LOAN_NOT_FOUND");
    return loan;
  }

  /** Resolves the caller's role and applies the state machine, mapping its errors to HTTP. */
  function guard(loan: LoanRow, userId: string, event: LoanEvent) {
    const actor = actorOf(loan, userId);
    if (!actor) throw forbidden("NOT_A_PARTICIPANT");
    try {
      return { actor, next: transition(loan.state, event, actor) };
    } catch (err) {
      if (err instanceof InvalidTransitionError) throw conflict("INVALID_LOAN_STATE");
      if (err instanceof ForbiddenActorError) throw forbidden("ACTION_NOT_ALLOWED_FOR_ROLE");
      throw err;
    }
  }

  async function checkPin(loan: LoanRow, expected: string | null, given: string) {
    if (loan.pinAttempts >= MAX_PIN_ATTEMPTS) throw new HttpError(429, "PIN_LOCKED");
    if (!expected || !safeEqual(expected, given)) {
      await repo.bumpPinAttempts(loan.id);
      throw badRequest("WRONG_PIN");
    }
  }

  /** Applies token / trust effects computed by the state machine. */
  async function applySettlement(loan: LoanRow, event: LoanEvent, tx: Parameters<typeof repo.find>[1]) {
    const s = settle(event, { fromState: loan.state, tokenLocked: loan.tokenLocked, isExternal: loan.borrowerId === null });
    if (loan.borrowerId) {
      if (s.borrowerTokens && !(await users.adjustTokens(loan.borrowerId, s.borrowerTokens, tx))) throw conflict("NO_TOKENS");
      if (s.borrowerTrust) await users.adjustTrust(loan.borrowerId, s.borrowerTrust, tx);
    }
    if (s.lenderTokens) await users.adjustTokens(loan.lenderId, s.lenderTokens, tx);
  }

  async function finishReturn(viewerId: string, loan: LoanRow, next: LoanRow["state"], condition: BookCondition) {
    const updated = await repo.transaction(async (tx) => {
      await applySettlement(loan, "RETURN", tx);
      const ok = await repo.moveState(
        loan.id,
        loan.state,
        { state: next, returnCondition: condition, returnedAt: new Date(), tokenLocked: false, pinAttempts: 0 },
        tx,
      );
      if (!ok) throw conflict("INVALID_LOAN_STATE");
      await catalog.setCopyState(loan.copyId, { status: "AVAILABLE", condition }, tx);
      return load(loan.id, tx);
    });
    return toLoanDto(updated, viewerId);
  }

  async function runReservation<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      // loans_one_open_per_copy: someone else already holds this copy.
      if (isUniqueViolation(err)) throw conflict("COPY_ALREADY_RESERVED");
      throw err;
    }
  }

  return {
    // ---- internal loans (between Pa-Varaq users) ----
    async requestLoan(borrowerId: string, input: { copyId: string; dueDate?: Date }) {
      const copy = await catalog.getCopyOrThrow(input.copyId);
      if (copy.ownerId === borrowerId) throw badRequest("CANNOT_BORROW_OWN_BOOK");
      if (copy.status !== "AVAILABLE") throw conflict("COPY_NOT_AVAILABLE");
      if (input.dueDate && input.dueDate <= new Date()) throw badRequest("DUE_DATE_IN_PAST");
      await users.assertCanBorrow(borrowerId);
      if (await repo.countOpenRequest(copy.id, borrowerId)) throw conflict("ALREADY_REQUESTED");
      const loan = await repo.create({ copyId: copy.id, lenderId: copy.ownerId, borrowerId, dueDate: input.dueDate, state: "REQUESTED" });
      return toLoanDto(loan, borrowerId);
    },

    async approve(lenderId: string, loanId: string, input: { dueDate?: Date }) {
      const loan = await load(loanId);
      const { next } = guard(loan, lenderId, "APPROVE");
      const updated = await runReservation(() =>
        repo.transaction(async (tx) => {
          const copy = await catalog.getCopyOrThrow(loan.copyId, tx);
          if (copy.status !== "AVAILABLE") throw conflict("COPY_NOT_AVAILABLE");
          await users.assertCanBorrow(loan.borrowerId!, tx);
          await applySettlement(loan, "APPROVE", tx);
          const ok = await repo.moveState(
            loan.id,
            loan.state,
            {
              state: next,
              handoverPin: randomDigits(PIN_LENGTH),
              tokenLocked: true,
              pinAttempts: 0,
              ...(input.dueDate ? { dueDate: input.dueDate } : {}),
            },
            tx,
          );
          if (!ok) throw conflict("INVALID_LOAN_STATE");
          return load(loan.id, tx);
        }),
      );
      return toLoanDto(updated, lenderId);
    },

    /** Borrower enters the PIN shown on the lender's phone and records the book's condition. */
    async handover(borrowerId: string, loanId: string, input: { pin: string; condition: BookCondition }) {
      const loan = await load(loanId);
      const { next } = guard(loan, borrowerId, "HANDOVER");
      await checkPin(loan, loan.handoverPin, input.pin);
      const updated = await repo.transaction(async (tx) => {
        const now = new Date();
        const ok = await repo.moveState(
          loan.id,
          loan.state,
          {
            state: next,
            returnPin: randomDigits(PIN_LENGTH),
            pinAttempts: 0,
            handoverCondition: input.condition,
            handoverAt: now,
            dueDate: loan.dueDate ?? addDays(now, DEFAULT_LOAN_DAYS),
          },
          tx,
        );
        if (!ok) throw conflict("INVALID_LOAN_STATE");
        await catalog.setCopyState(loan.copyId, { status: "LOANED_INTERNAL" }, tx);
        return load(loan.id, tx);
      });
      return toLoanDto(updated, borrowerId);
    },

    /** Lender enters the PIN shown on the borrower's phone and records the returned condition. */
    async returnBook(lenderId: string, loanId: string, input: { pin: string; condition: BookCondition }) {
      const loan = await load(loanId);
      const { next } = guard(loan, lenderId, "RETURN");
      await checkPin(loan, loan.returnPin, input.pin);
      return finishReturn(lenderId, loan, next, input.condition);
    },

    async cancel(userId: string, loanId: string) {
      const loan = await load(loanId);
      const { next } = guard(loan, userId, "CANCEL");
      const updated = await repo.transaction(async (tx) => {
        await applySettlement(loan, "CANCEL", tx);
        const ok = await repo.moveState(loan.id, loan.state, { state: next, tokenLocked: false }, tx);
        if (!ok) throw conflict("INVALID_LOAN_STATE");
        return load(loan.id, tx);
      });
      return toLoanDto(updated, userId);
    },

    // ---- external loans (book lent to someone outside Pa-Varaq) ----
    async createExternal(ownerId: string, input: { copyId: string; borrowerName: string; dueDate: Date }) {
      const copy = await catalog.getCopyOrThrow(input.copyId);
      if (copy.ownerId !== ownerId) throw forbidden("NOT_COPY_OWNER");
      if (copy.status !== "AVAILABLE" && copy.status !== "UNAVAILABLE") throw conflict("COPY_IS_LOANED");
      const loan = await runReservation(() =>
        repo.transaction(async (tx) => {
          const created = await repo.create(
            {
              copyId: copy.id,
              lenderId: ownerId,
              externalBorrowerName: input.borrowerName,
              state: "ACTIVE",
              dueDate: input.dueDate,
              handoverCondition: copy.condition,
              handoverAt: new Date(),
            },
            tx,
          );
          await catalog.setCopyState(copy.id, { status: "LOANED_EXTERNAL" }, tx);
          return created;
        }),
      );
      return toLoanDto(loan, ownerId);
    },

    async returnExternal(ownerId: string, loanId: string, condition?: BookCondition) {
      const loan = await load(loanId);
      if (loan.borrowerId !== null) throw badRequest("NOT_AN_EXTERNAL_LOAN");
      const { next } = guard(loan, ownerId, "RETURN");
      return finishReturn(ownerId, loan, next, condition ?? loan.copy.condition);
    },

    // ---- queries ----
    async list(userId: string, filter: { role?: "borrower" | "lender"; state?: LoanRow["state"] }) {
      return (await repo.listForUser(userId, filter)).map((l) => toLoanDto(l, userId));
    },
    async get(userId: string, loanId: string) {
      const loan = await load(loanId);
      if (!actorOf(loan, userId)) throw forbidden("NOT_A_PARTICIPANT");
      return toLoanDto(loan, userId);
    },

    /** Flags ACTIVE loans past their due date as OVERDUE. Run periodically. */
    async markOverdue(now = new Date()): Promise<number> {
      let count = 0;
      for (const candidate of await repo.findOverdueCandidates(now)) {
        const moved = await repo.transaction(async (tx) => {
          const loan = await load(candidate.id, tx);
          const ok = await repo.moveState(loan.id, "ACTIVE", { state: transition("ACTIVE", "MARK_OVERDUE", "SYSTEM") }, tx);
          if (ok) await applySettlement(loan, "MARK_OVERDUE", tx);
          return ok;
        });
        if (moved) count++;
      }
      return count;
    },

    // ---- public API for the discover overview ----
    activeLoanCount: () => repo.countActive(),
    completedLoanCount: () => repo.countCompleted(),
    topLenders: (limit: number) => repo.topLenders(limit),
    async recentReturns(limit: number) {
      return (await repo.recentReturned(limit)).map((l) => ({
        title: l.copy.edition.title,
        lender: l.lender.firstName ?? l.lender.username,
        at: l.returnedAt,
      }));
    },

    // ---- public API for the passport module ----
    async getLoanSummary(loanId: string) {
      const loan = await load(loanId);
      return { id: loan.id, copyId: loan.copyId, lenderId: loan.lenderId, borrowerId: loan.borrowerId, state: loan.state };
    },
    async listReturnedAsBorrower(userId: string) {
      return (await repo.listReturnedForBorrower(userId)).map((l) => toLoanDto(l, userId));
    },
  };
}
