import type { Config } from "../../config";
import { HttpError, badRequest, forbidden } from "../../lib/errors";
import { hashContact, randomDigits, safeEqual } from "../../lib/hash";
import type { KeyValueStore } from "../../lib/redis";
import type { CirclesService } from "../circles";
import type { UsersService } from "../users";
import { toPrivateUser } from "../users/user.service";

const OTP_TTL = 600;
const REQUEST_LIMIT = { max: 5, window: 600 };
const VERIFY_LIMIT = { max: 5, window: 300 };

/** Delivery channel for OTP codes (SMS / email gateway plug in here). */
export type OtpSender = { send(contact: string, code: string): Promise<void> };
export const consoleOtpSender: OtpSender = {
  async send(contact, code) {
    const maskedContact = `${contact.slice(0, 2)}******${contact.slice(-2)}`;
    console.log(`[otp] code for ${maskedContact}: ${code}`);
  },
};

const productionOtpSender: OtpSender = {
  async send() {
    throw new Error("OTP delivery provider is not configured for production");
  },
};

/** The console sender is a local-development fallback, never a production transport. */
export function createDefaultOtpSender(nodeEnv: Config["NODE_ENV"]): OtpSender {
  return nodeEnv === "production" ? productionOtpSender : consoleOtpSender;
}

export type Registration = {
  firstName: string;
  lastName: string;
  username: string;
  avatarId: number;
};
export type VerifyInput = { phone: string; code: string; registration?: Registration; inviteCode?: string };

export type AuthService = ReturnType<typeof createAuthService>;

export function createAuthService(deps: {
  config: Config;
  store: KeyValueStore;
  users: UsersService;
  circles: CirclesService;
  sender: OtpSender;
  signToken: (userId: string) => string;
}) {
  const { config, store, users, circles, sender, signToken } = deps;
  // Phones are hashed in international form (+98912...) so the hash is format-independent.
  const hash = (phone: string) => hashContact(`+98${phone.slice(1)}`, config.CONTACT_HASH_PEPPER);

  async function limit(key: string, { max, window }: { max: number; window: number }) {
    if ((await store.incr(key, window)) > max) throw new HttpError(429, "TOO_MANY_ATTEMPTS");
  }

  return {
    async requestOtp(phone: string) {
      const h = hash(phone);
      await limit(`otp:req:${h}`, REQUEST_LIMIT);
      const code = config.DEV_FIXED_OTP ?? randomDigits(6);
      await store.set(`otp:code:${h}`, code, OTP_TTL);
      await sender.send(phone, code);
      // The code is only ever echoed when a fixed dev OTP is configured.
      return { sent: true, ...(config.DEV_FIXED_OTP ? { devCode: code } : {}) };
    },

    async verifyOtp(input: VerifyInput) {
      const h = hash(input.phone);
      await limit(`otp:ver:${h}`, VERIFY_LIMIT);
      const expected = await store.get(`otp:code:${h}`);
      // In development a fixed OTP (DEV_FIXED_OTP) is always accepted, even if it expired.
      const devOk = !!config.DEV_FIXED_OTP && input.code === config.DEV_FIXED_OTP;
      if (!devOk) {
        if (!expected) throw badRequest("OTP_EXPIRED");
        if (!safeEqual(expected, input.code)) throw badRequest("INVALID_OTP");
      }

      const existing = await users.findByPhone(input.phone, h);
      if (existing) {
        await store.del(`otp:code:${h}`);
        return { registrationRequired: false as const, isNewUser: false, token: signToken(existing.id), user: toPrivateUser(existing) };
      }

      // New phone number: the client must come back with the onboarding (KYC) details; the code stays valid.
      if (!input.registration) return { registrationRequired: true as const };

      const inviteValid = input.inviteCode ? await circles.inviteCodeExists(input.inviteCode) : false;
      if (input.inviteCode && !inviteValid) throw badRequest("INVALID_INVITE_CODE");
      if (config.REQUIRE_INVITE && !inviteValid) throw forbidden("INVITE_REQUIRED");

      const r = input.registration;
      const user = await users.register({ ...r, phoneNumber: input.phone, contactHash: h });
      await store.del(`otp:code:${h}`);
      if (input.inviteCode) await circles.joinByInviteCode(user.id, input.inviteCode);
      return { registrationRequired: false as const, isNewUser: true, token: signToken(user.id), user: toPrivateUser(user) };
    },
  };
}
