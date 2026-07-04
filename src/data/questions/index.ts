import { programmingQuestions } from './programming';
import { historyQuestions } from './history';
import { englishQuestions } from './english';
import { mathQuestions } from './math';
import { generalQuestions } from './general';
import { sistemDigitalQuestions } from './sistem_digital';
import { logikaMtkQuestions } from './logika_mtk';
import type { QuestionTheme } from '@/types/game';

export const ALL_QUESTIONS: Record<QuestionTheme, any[]> = {
  general: generalQuestions,
  programming: programmingQuestions,
  sistem_digital: sistemDigitalQuestions,
  logika_mtk: logikaMtkQuestions,
  matematika: mathQuestions,
  english: englishQuestions,
  history: historyQuestions,
};

export const getQuestionsByTheme = (theme: QuestionTheme) => {
  return ALL_QUESTIONS[theme] || ALL_QUESTIONS['general'];
};
