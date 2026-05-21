import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const STORAGE_PATH = resolve("data", "access-codes.json");

export type AccessCode = {
  code: string;
  createdAt: string;
  createdBy: number;
  revokedAt?: string;
  revokedBy?: number;
  usedAt?: string;
  usedBy?: number;
};

type AccessCodesStorage = {
  codes: AccessCode[];
};

const createEmptyStorage = (): AccessCodesStorage => ({
  codes: [],
});

const normalizeCode = (code: string) => code.trim().toUpperCase();

const readStorage = async () => {
  try {
    const fileContent = await readFile(STORAGE_PATH, "utf8");
    const parsedStorage = JSON.parse(fileContent) as AccessCodesStorage;

    if (!Array.isArray(parsedStorage.codes)) {
      return createEmptyStorage();
    }

    return parsedStorage;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return createEmptyStorage();
    }

    throw error;
  }
};

const writeStorage = async (storage: AccessCodesStorage) => {
  await mkdir(dirname(STORAGE_PATH), { recursive: true });
  await writeFile(STORAGE_PATH, `${JSON.stringify(storage, null, 2)}\n`, "utf8");
};

export const accessCodesStorage = {
  async create(code: string, createdBy: number) {
    const normalizedCode = normalizeCode(code);
    const storage = await readStorage();

    if (storage.codes.some((accessCode) => accessCode.code === normalizedCode)) {
      return false;
    }

    await writeStorage({
      codes: [
        ...storage.codes,
        {
          code: normalizedCode,
          createdAt: new Date().toISOString(),
          createdBy,
        },
      ],
    });

    return true;
  },

  async hasRedeemedCode(userId: number) {
    const storage = await readStorage();

    return storage.codes.some((accessCode) => accessCode.usedBy === userId);
  },

  async listActive(limit = 20) {
    const storage = await readStorage();

    return storage.codes
      .filter((accessCode) => accessCode.usedBy === undefined && accessCode.revokedAt === undefined)
      .slice(-limit)
      .reverse();
  },

  async redeem(code: string, userId: number) {
    const normalizedCode = normalizeCode(code);
    const storage = await readStorage();
    const accessCode = storage.codes.find((storedCode) => storedCode.code === normalizedCode);

    if (!accessCode) {
      return "not_found" as const;
    }

    if (accessCode.revokedAt !== undefined) {
      return "revoked" as const;
    }

    if (accessCode.usedBy === userId) {
      return "already_redeemed_by_user" as const;
    }

    if (accessCode.usedBy !== undefined) {
      return "already_used" as const;
    }

    await writeStorage({
      codes: storage.codes.map((storedCode) => {
        if (storedCode.code !== normalizedCode) {
          return storedCode;
        }

        return {
          ...storedCode,
          usedAt: new Date().toISOString(),
          usedBy: userId,
        };
      }),
    });

    return "redeemed" as const;
  },

  async revoke(code: string, revokedBy: number) {
    const normalizedCode = normalizeCode(code);
    const storage = await readStorage();
    const accessCode = storage.codes.find((storedCode) => storedCode.code === normalizedCode);

    if (!accessCode) {
      return "not_found" as const;
    }

    if (accessCode.usedBy !== undefined) {
      return "already_used" as const;
    }

    if (accessCode.revokedAt !== undefined) {
      return "already_revoked" as const;
    }

    await writeStorage({
      codes: storage.codes.map((storedCode) => {
        if (storedCode.code !== normalizedCode) {
          return storedCode;
        }

        return {
          ...storedCode,
          revokedAt: new Date().toISOString(),
          revokedBy,
        };
      }),
    });

    return "revoked" as const;
  },
};
