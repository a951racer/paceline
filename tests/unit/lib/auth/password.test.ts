import { describe, it, expect } from "@jest/globals";
import { hashPassword, comparePassword } from "@/lib/auth/password";

describe("Password Hashing Utilities", () => {
  describe("hashPassword", () => {
    it("returns a bcrypt hash string", async () => {
      const hash = await hashPassword("mySecurePassword123");
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      // bcrypt hashes start with $2b$ (or $2a$)
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it("produces different hashes for the same password (unique salts)", async () => {
      const hash1 = await hashPassword("samePassword");
      const hash2 = await hashPassword("samePassword");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("comparePassword", () => {
    it("returns true for a matching password", async () => {
      const password = "correctPassword";
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it("returns false for a non-matching password", async () => {
      const hash = await hashPassword("correctPassword");
      const result = await comparePassword("wrongPassword", hash);
      expect(result).toBe(false);
    });

    it("handles empty password correctly", async () => {
      const hash = await hashPassword("notEmpty");
      const result = await comparePassword("", hash);
      expect(result).toBe(false);
    });
  });
});
