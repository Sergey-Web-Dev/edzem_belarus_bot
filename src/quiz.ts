export type QuizQuestion = {
  text: string;
  correctAnswer: string;
  isCorrect: (answer: string) => boolean;
};

export const START_WORD = "начать";
export const MAX_WRONG_ANSWERS = 1;

export const WELCOME_MESSAGE = `Привет, путешественник! Ты почти у цели. Задания выполнены, ответы записаны. Теперь осталось главное — узнать правильные ответы. Напиши «${START_WORD}», и я задам первый вопрос.`;

export const SUCCESS_MESSAGE = `Поздравляем! Ты прошёл квест!

Команда edzem_belarus в восторге от твоей внимательности и любви к путешествиям. Ты не просто проехал маршрут — ты нашёл все тайны, которые мы спрятали в шести точках.

А теперь — твой подарок 🎁

Сделай скриншот этого сообщения и отправь его в директ https://www.instagram.com/edzem_belarus/ в Instagram. Мы проверим — и вышлем тебе подарок.

Спасибо, что путешествуешь с нами. Едзем дальше! 🚙`;

export const FAILURE_MESSAGE = `Ты прошёл весь маршрут, и это уже большое приключение. Но не все ответы правильные. Не расстраивайся — в следующий раз ты точно найдёшь все тайны!`;

export const NOT_STARTED_MESSAGE = `Напиши «${START_WORD}», чтобы начать квест.`;

const normalizeAnswer = (answer: string) => answer.trim().toLowerCase().replace(/\s+/g, " ");

const oneOf = (acceptedAnswers: string[]) => {
  const normalizedAnswers = acceptedAnswers.map((answer) => normalizeAnswer(answer));

  return (answer: string) => normalizedAnswers.includes(normalizeAnswer(answer));
};

const numberInRange = (min: number, max: number) => {
  return (answer: string) => {
    const parsedAnswer = Number(normalizeAnswer(answer));

    return Number.isInteger(parsedAnswer) && parsedAnswer >= min && parsedAnswer <= max;
  };
};

export const quizQuestions: QuizQuestion[] = [
  {
    text: "СУББОТНИКИ\n\n1. Сколько крестов на здании костела св. Владислава в д. Субботники? Укажи цифру.",
    correctAnswer: "4",
    isCorrect: oneOf(["4"]),
  },
  {
    text: "СУББОТНИКИ\n\n2. На сколько частей разделено круглое окно-роза на фасаде костёла св. Владислава в д. Субботники? Укажи цифру.",
    correctAnswer: "6",
    isCorrect: oneOf(["6"]),
  },
  {
    text: "СУББОТНИКИ\n\n3. Что означает слоган Владислава Умястовского? Введи номер правильного ответа (1, 2 или 3).",
    correctAnswer: "2",
    isCorrect: oneOf(["2"]),
  },
  {
    text: "ЖЕМЫСЛАВЛЬ. УСАДЬБА УМЯСТОВСКИХ\n\n1. Какие деревья посажены на аллее, ведущей к усадьбе Умястовских?\nНазвание дерева укажи в единственном числе.",
    correctAnswer: "Липа",
    isCorrect: oneOf(["липа"]),
  },
  {
    text: "ЖЕМЫСЛАВЛЬ. УСАДЬБА УМЯСТОВСКИХ\n\n2. С обратной стороны усадьбы Умястовских вход выложен плиткой с повторяющимся узором. Какой цвет в узоре самый яркий?",
    correctAnswer: "голубой или синий",
    isCorrect: oneOf(["голубой", "синий"]),
  },
  {
    text: "ЖЕМЫСЛАВЛЬ. УСАДЬБА УМЯСТОВСКИХ\n\n3. Сколько круглых колонн в усадьбе Умястовских?",
    correctAnswer: "8",
    isCorrect: oneOf(["8"]),
  },
  {
    text: "ТРАБЫ\n\n1. Чему равна сумма входов на территорию костёла и дверей в сам костёл в д. Трабы? Укажи цифру.",
    correctAnswer: "7",
    isCorrect: oneOf(["7"]),
  },
  {
    text: "ТРАБЫ\n\n2. Какой геометрической фигуры нет на фасаде костёла Рождества Девы Марии со стороны главного входа? Введи номер ответа.",
    correctAnswer: "3",
    isCorrect: oneOf(["3"]),
  },
  {
    text: "ТРАБЫ\n\n3. Сколько стрельчатых арок украшают главный вход костёла Рождества Девы Марии? В ответе укажи цифру.",
    correctAnswer: "4",
    isCorrect: oneOf(["4"]),
  },
  {
    text: "ГОЛЬШАНЫ\n\n1. Какие скульптурные элементы украшают верх фасада костёла в Гольшанах?",
    correctAnswer: "вазы",
    isCorrect: oneOf(["вазы", "ваза"]),
  },
  {
    text: "ГОЛЬШАНЫ\n\n2. В каком году открылась экспозиция «Гольшанский замок»?",
    correctAnswer: "2021",
    isCorrect: oneOf(["2021"]),
  },
  {
    text: "ДЕСЯТНИКИ\n\n1. Введи сумму цифр года создания ротонды с орлом в д. Десятники.",
    correctAnswer: "17",
    isCorrect: oneOf(["17"]),
  },
  {
    text: "ДЕСЯТНИКИ\n\n2. Укажи фамилию архитектора на ротонде с орлом в д. Десятники? Введи её на языке оригинала.",
    correctAnswer: "Bollmann",
    isCorrect: oneOf(["bollmann"]),
  },
  {
    text: "ДЕСЯТНИКИ\n\n3. Что означает аббревиатура M.R.P. на геодезическом знаке ротонды? Введи номер ответа: 1, 2 или 3",
    correctAnswer: "1",
    isCorrect: oneOf(["1"]),
  },
  {
    text: "ВИШНЕВО\n\n1. Кто изображён на круглом витраже костёла в д. Вишнево?\nВ ответе укажи цифру.",
    correctAnswer: "2",
    isCorrect: oneOf(["2"]),
  },
  {
    text: "ВИШНЕВО\n\n2. Сколько шагов от костёла до церкви в д. Вишнево?",
    correctAnswer: "любое число от 100 до 600",
    isCorrect: numberInRange(100, 600),
  },
  {
    text: "ВИШНЕВО\n\n3. К какому типу храмов в народе относят церковь св. Космы и Дамиана в д. Вишнево? В ответе укажи цифру.",
    correctAnswer: "1",
    isCorrect: oneOf(["1"]),
  },
];
