import { Writable } from "node:stream";
import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createLoggerOptions } from "./app";
import { consoleOtpSender, createDefaultOtpSender } from "./modules/auth/auth.service";

describe("API log privacy", () => {
  it("redacts sensitive request fields and authorization headers from logs at any nesting depth", async () => {
    const output: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        output.push(chunk.toString());
        callback();
      },
    });
    const loggerOptions = createLoggerOptions("development");
    if (!loggerOptions) throw new Error("Development logging must be enabled");

    const app = Fastify({ logger: { ...loggerOptions, stream } });
    app.post("/__test/log-privacy", async (request) => {
      request.log.info(
        {
          request: {
            headers: request.headers,
            body: request.body,
          },
        },
        "request payload",
      );
      return { ok: true };
    });

    try {
      await app.inject({
        method: "POST",
        url: "/__test/log-privacy",
        headers: { authorization: "Bearer secret-token" },
        payload: {
          phone: "09121110001",
          nationalCode: "0012345678",
          birthDate: "1378/04/15",
          code: "123456",
          nested: {
            profile: {
              contact: { phone: "09998887766" },
              verification: { details: { otp: "654321" } },
            },
          },
        },
      });
    } finally {
      await app.close();
    }

    const logs = output.join("");
    for (const secret of [
      "Bearer secret-token",
      "09121110001",
      "0012345678",
      "1378/04/15",
      "123456",
      "09998887766",
      "654321",
    ]) {
      expect(logs).not.toContain(secret);
    }
    expect(logs).toContain("[REDACTED]");
  });

  it("masks the phone number when using the development console sender", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await consoleOtpSender.send("09121110001", "123456");

    expect(log).toHaveBeenCalledWith("[otp] code for 09******01: 123456");
    expect(log.mock.calls.flat().join(" ")).not.toContain("09121110001");
  });

  it("does not select the console sender in production", async () => {
    const sender = createDefaultOtpSender("production");

    expect(sender).not.toBe(consoleOtpSender);
    await expect(sender.send("09121110001", "123456")).rejects.toThrow(
      "OTP delivery provider is not configured for production",
    );
  });
});
