import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const STORAGE_PATH = resolve("data", "completed-users.json");

type CompletedUsersStorage = {
  completedUserIds: number[];
};

const createEmptyStorage = (): CompletedUsersStorage => ({
  completedUserIds: [],
});

const readStorage = async () => {
  try {
    const fileContent = await readFile(STORAGE_PATH, "utf8");
    const parsedStorage = JSON.parse(fileContent) as CompletedUsersStorage;

    if (!Array.isArray(parsedStorage.completedUserIds)) {
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

const writeStorage = async (storage: CompletedUsersStorage) => {
  await mkdir(dirname(STORAGE_PATH), { recursive: true });
  await writeFile(STORAGE_PATH, `${JSON.stringify(storage, null, 2)}\n`, "utf8");
};

export const completedUsersStorage = {
  async has(userId: number) {
    const storage = await readStorage();

    return storage.completedUserIds.includes(userId);
  },

  async add(userId: number) {
    const storage = await readStorage();

    if (storage.completedUserIds.includes(userId)) {
      return;
    }

    await writeStorage({
      completedUserIds: [...storage.completedUserIds, userId],
    });
  },

  async remove(userId: number) {
    const storage = await readStorage();

    await writeStorage({
      completedUserIds: storage.completedUserIds.filter((completedUserId) => completedUserId !== userId),
    });
  },
};
