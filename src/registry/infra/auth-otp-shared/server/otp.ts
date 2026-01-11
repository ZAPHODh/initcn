import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 3;
const digits = "0123456789";

export function generateOTP(length: number = OTP_LENGTH): string {
  const random: RandomReader = {
    read(bytes: Uint8Array) {
      crypto.getRandomValues(bytes);
    },
  };

  return generateRandomString(random, digits, length);
}

export function getOTPExpiry(minutes: number = OTP_EXPIRY_MINUTES): Date {
  return new Date(Date.now() + 1000 * 60 * minutes);
}

export function isOTPExpired(expiresAt: Date): boolean {
  return Date.now() > expiresAt.getTime();
}
