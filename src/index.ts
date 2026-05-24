import "dotenv/config";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { Markup, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { Context } from "telegraf";

import {
  FAILURE_MESSAGE,
  MAX_WRONG_ANSWERS,
  NOT_STARTED_MESSAGE,
  START_WORD,
  SUCCESS_MESSAGE,
  WELCOME_MESSAGE,
  quizQuestions,
} from "./quiz.js";
import { accessCodesStorage } from "./accessCodesStorage.js";
import { completedUsersStorage } from "./completedUsersStorage.js";
import { startKeepAlive, createHealthServer } from "./keepAlive.js";

type QuizState = {
  currentQuestionIndex: number;
  wrongAnswers: number;
};

const parseIds = (ids: string | undefined) =>
  new Set(
    (ids ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id)),
  );

const token = process.env.BOT_TOKEN;
const adminIds = parseIds(process.env.ADMIN_IDS);
const creatorIds = parseIds(process.env.CREATOR_IDS);
const healthCheckPort = Number(process.env.PORT ?? 10000);

if (!token) {
  throw new Error("BOT_TOKEN is required. Add it to your .env file.");
}

const bot = new Telegraf(token);
const quizStates = new Map<number, QuizState>();
const accessRequiredMessage = "Для доступа к квесту нужен одноразовый код из сертификата или QR-кода.";
const lockedUserMessage = "Ты уже начал или прошёл квест. Повторное прохождение с этого профиля недоступно.";

// Запускаем health check сервер
const healthServer = createHealthServer();

// Запускаем keep-alive сервис для предотвращения сна на Render
const keepAliveService = startKeepAlive();

const normalizeText = (text: string) => text.trim().toLowerCase();

const generateAccessCode = () => `EDZEM-${randomBytes(4).toString("hex").toUpperCase()}`;

const getChatId = (ctx: Context) => {
  const chatId = ctx.chat?.id;

  if (chatId === undefined) {
    throw new Error("Chat ID is missing from Telegram update.");
  }

  return chatId;
};

const getUserId = (ctx: Context) => {
  const userId = ctx.from?.id;

  if (userId === undefined) {
    throw new Error("User ID is missing from Telegram update.");
  }

  return userId;
};

const isAdmin = (userId: number) => adminIds.has(userId);
const canManageAccessCodes = (userId: number) => isAdmin(userId) || creatorIds.has(userId);

const getStartPayload = (text: string) => {
  const [, payload] = text.trim().split(/\s+/, 2);

  return payload;
};

const getAccessLink = async (ctx: Context, code: string) => {
  const botInfo = await ctx.telegram.getMe();

  return `https://t.me/${botInfo.username}?start=${code}`;
};

const createAccessCodes = async (ctx: Context, count: number) => {
  const adminId = getUserId(ctx);
  const codes: string[] = [];
  let attempts = 0;

  while (codes.length < count && attempts < count * 5) {
    attempts += 1;

    const code = generateAccessCode();
    const isCreated = await accessCodesStorage.create(code, adminId);

    if (!isCreated) {
      continue;
    }

    codes.push(code);
  }

  if (codes.length !== count) {
    throw new Error("Could not generate enough unique access codes.");
  }

  const links = await Promise.all(codes.map(async (code) => `${code}\n${await getAccessLink(ctx, code)}`));

  await ctx.reply(links.join("\n\n"));
};

const showAccessCodeMenu = async (ctx: Context) => {
  await ctx.reply(
    "Управление кодами доступа:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Создать 1 код", "codes:create:1"),
        Markup.button.callback("Создать 5 кодов", "codes:create:5"),
      ],
      [Markup.button.callback("Создать 10 кодов", "codes:create:10")],
      [
        Markup.button.callback("Активные коды", "codes:list"),
        Markup.button.callback("Отозвать код", "codes:revoke-menu"),
      ],
    ]),
  );
};

const assertCanManageAccessCodes = async (ctx: Context) => {
  const userId = getUserId(ctx);

  if (canManageAccessCodes(userId)) {
    return true;
  }

  await ctx.reply("Команда доступна только администратору или креатору.");
  return false;
};

const showActiveAccessCodes = async (ctx: Context) => {
  const activeCodes = await accessCodesStorage.listActive();

  if (activeCodes.length === 0) {
    await ctx.reply("Активных кодов нет.");
    return;
  }

  await ctx.reply(activeCodes.map((accessCode) => accessCode.code).join("\n"));
};

const showRevokeAccessCodeMenu = async (ctx: Context) => {
  const activeCodes = await accessCodesStorage.listActive(10);

  if (activeCodes.length === 0) {
    await ctx.reply("Нет активных кодов для отзыва.");
    return;
  }

  await ctx.reply(
    "Выбери код, который нужно отозвать:",
    Markup.inlineKeyboard(
      activeCodes.map((accessCode) => [
        Markup.button.callback(accessCode.code, `codes:revoke:${accessCode.code}`),
      ]),
    ),
  );
};

const getQuestionMessage = (questionIndex: number) => {
  const question = quizQuestions[questionIndex];

  if (!question) {
    throw new Error(`Question ${questionIndex} does not exist.`);
  }

  return `Вопрос ${questionIndex + 1} из ${quizQuestions.length}\n\n${question.text}`;
};

const startQuiz = async (ctx: Context) => {
  const chatId = getChatId(ctx);
  const userId = getUserId(ctx);

  if (quizStates.has(chatId)) {
    await ctx.reply("Квест уже начат. Продолжай отвечать на текущий вопрос.");
    return;
  }

  if (await completedUsersStorage.has(userId)) {
    await ctx.reply(lockedUserMessage);
    return;
  }

  if (!(await accessCodesStorage.hasRedeemedCode(userId))) {
    await ctx.reply(accessRequiredMessage);
    return;
  }

  quizStates.set(chatId, {
    currentQuestionIndex: 0,
    wrongAnswers: 0,
  });

  await completedUsersStorage.add(userId);
  await ctx.reply(getQuestionMessage(0));
};

const finishQuiz = async (ctx: Context, chatId: number, wrongAnswers: number) => {
  const userId = getUserId(ctx);

  quizStates.delete(chatId);
  await completedUsersStorage.add(userId);

  if (wrongAnswers > MAX_WRONG_ANSWERS) {
    await ctx.reply(FAILURE_MESSAGE);
    return;
  }

  await ctx.reply(SUCCESS_MESSAGE);
};

bot.start(async (ctx) => {
  const chatId = getChatId(ctx);
  const userId = getUserId(ctx);
  const startPayload = getStartPayload(ctx.message.text);

  if (quizStates.has(chatId)) {
    await ctx.reply("Квест уже начат. Продолжай отвечать на текущий вопрос.");
    return;
  }

  if (await completedUsersStorage.has(userId)) {
    await ctx.reply(lockedUserMessage);
    return;
  }

  if (!startPayload) {
    if (await accessCodesStorage.hasRedeemedCode(userId)) {
      await ctx.reply(WELCOME_MESSAGE);
      return;
    }

    await ctx.reply(accessRequiredMessage);
    return;
  }

  const redeemResult = await accessCodesStorage.redeem(startPayload, userId);

  if (redeemResult === "not_found" || redeemResult === "already_used" || redeemResult === "revoked") {
    await ctx.reply("Код доступа недействителен или уже использован.");
    return;
  }

  await ctx.reply(WELCOME_MESSAGE);
});

bot.command("create", async (ctx) => {
  if (!(await assertCanManageAccessCodes(ctx))) {
    return;
  }

  await showAccessCodeMenu(ctx);
});

bot.command("createcode", async (ctx) => {
  if (!(await assertCanManageAccessCodes(ctx))) {
    return;
  }

  await createAccessCodes(ctx, 1);
});

bot.command("createcodes", async (ctx) => {
  if (!(await assertCanManageAccessCodes(ctx))) {
    return;
  }

  const [, countRaw] = ctx.message.text.trim().split(/\s+/);
  const count = Number(countRaw);

  if (!Number.isInteger(count) || count < 1 || count > 50) {
    await ctx.reply("Использование: /createcodes <число от 1 до 50>");
    return;
  }

  await createAccessCodes(ctx, count);
});

bot.action(/^codes:create:(1|5|10)$/, async (ctx) => {
  if (!canManageAccessCodes(getUserId(ctx))) {
    await ctx.answerCbQuery("Нет доступа.");
    return;
  }

  await ctx.answerCbQuery();
  await createAccessCodes(ctx, Number(ctx.match[1]));
});

bot.action("codes:list", async (ctx) => {
  if (!canManageAccessCodes(getUserId(ctx))) {
    await ctx.answerCbQuery("Нет доступа.");
    return;
  }

  await ctx.answerCbQuery();
  await showActiveAccessCodes(ctx);
});

bot.action("codes:revoke-menu", async (ctx) => {
  if (!canManageAccessCodes(getUserId(ctx))) {
    await ctx.answerCbQuery("Нет доступа.");
    return;
  }

  await ctx.answerCbQuery();
  await showRevokeAccessCodeMenu(ctx);
});

bot.action(/^codes:revoke:(EDZEM-[A-F0-9]+)$/, async (ctx) => {
  const userId = getUserId(ctx);

  if (!canManageAccessCodes(userId)) {
    await ctx.answerCbQuery("Нет доступа.");
    return;
  }

  const revokeResult = await accessCodesStorage.revoke(ctx.match[1], userId);

  if (revokeResult !== "revoked") {
    await ctx.answerCbQuery("Код уже нельзя отозвать.");
    return;
  }

  await ctx.answerCbQuery("Код отозван.");
  await ctx.editMessageText(`Код ${ctx.match[1]} отозван.`);
});

bot.command("reset", async (ctx) => {
  const adminId = getUserId(ctx);

  if (!isAdmin(adminId)) {
    await ctx.reply("Команда доступна только администратору.");
    return;
  }

  const [, targetUserIdRaw] = ctx.message.text.trim().split(/\s+/);
  const targetUserId = Number(targetUserIdRaw);

  if (!Number.isInteger(targetUserId)) {
    await ctx.reply("Использование: /reset <telegram_id>");
    return;
  }

  quizStates.delete(targetUserId);
  await completedUsersStorage.remove(targetUserId);
  await ctx.reply(`Пользователь ${targetUserId} сброшен. Теперь он может пройти квест заново.`);
});

bot.on(message("text"), async (ctx) => {
  const chatId = getChatId(ctx);
  const userId = getUserId(ctx);
  const userAnswer = ctx.message.text;

  if (normalizeText(userAnswer) === START_WORD) {
    await startQuiz(ctx);
    return;
  }

  const state = quizStates.get(chatId);

  if (!state) {
    if (await completedUsersStorage.has(userId)) {
      await ctx.reply(lockedUserMessage);
      return;
    }

    if (!(await accessCodesStorage.hasRedeemedCode(userId))) {
      await ctx.reply(accessRequiredMessage);
      return;
    }

    await ctx.reply(NOT_STARTED_MESSAGE);
    return;
  }

  const question = quizQuestions[state.currentQuestionIndex];

  if (!question) {
    await finishQuiz(ctx, chatId, state.wrongAnswers);
    return;
  }

  const isCorrectAnswer = question.isCorrect(userAnswer);

  if (!isCorrectAnswer) {
    state.wrongAnswers += 1;
    await ctx.reply(`Правильный ответ - ${question.correctAnswer}.`);
  } else {
    await ctx.reply("Верно.");
  }

  state.currentQuestionIndex += 1;

  if (state.currentQuestionIndex >= quizQuestions.length) {
    await finishQuiz(ctx, chatId, state.wrongAnswers);
    return;
  }

  await ctx.reply(getQuestionMessage(state.currentQuestionIndex));
});

bot.launch();

process.once("SIGINT", () => {
  keepAliveService.stop();
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  keepAliveService.stop();
  bot.stop("SIGTERM");
});
