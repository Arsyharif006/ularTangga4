import { programmingQuestions } from './programming';
import { historyQuestions } from './history';
import { englishQuestions } from './english';
import { mathQuestions } from './math';
import { generalQuestions } from './general';
import { sistemDigitalQuestions } from './sistem_digital';
import { logikaMtkQuestions } from './logika_mtk';
import type { QuestionTheme } from '@/types/game';

export const ALL_QUESTIONS: Record<QuestionTheme, any[]> = {
  sd: generalQuestions,
  smp: generalQuestions,
  sma_smk: generalQuestions,
  general: generalQuestions,
  programming: programmingQuestions,
  sistem_digital: sistemDigitalQuestions,
  logika_mtk: logikaMtkQuestions,
  matematika: mathQuestions,
  english: englishQuestions,
  history: historyQuestions,
  bahasa_indonesia: generalQuestions,
  ipa: generalQuestions,
  ips: generalQuestions,
  ppkn: generalQuestions,
  fisika: generalQuestions,
  kimia: generalQuestions,
  broadcasting: generalQuestions,
  informatika: generalQuestions,
  tkj: generalQuestions,
  desain_grafis: generalQuestions,
};

export const getQuestionsByTheme = (theme: QuestionTheme) => {
  return ALL_QUESTIONS[theme] || ALL_QUESTIONS['general'];
};
