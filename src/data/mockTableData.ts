import type { TableRowData } from '../types/student';

const names = [
  'Satoshi Nakamoto', 'Hal Finney', 'Adam Back', 'Wei Dai',
  'Nick Szabo', 'Pieter Wuille', 'Gregory Maxwell', 'Wladimir van der Laan',
  'Jonas Schnelli', 'Marco Falke', 'Andrew Chow', 'Gloria Zhao',
  'Suhas Daftuar', 'John Newbery', 'Fabian Jahr', 'Sebastian Falbesoner',
];

const discordNames = [
  'satoshi_dev', 'hal_finney42', 'adam_hashcash', 'wei_dai_btc',
  'nick_bitgold', 'sipa_dev', 'gmaxwell', 'laanwj',
  'jonasschnelli', 'marcofalke', 'achow101', 'glozow',
  'sdaftuar', 'jnewbery', 'fjahr', 'theStack',
];

const taNames = ['Rajarshi Maitra', 'Adi Shankara', 'Kgothatso Ngako'];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockTableData(weekNumber: number, count = 16): TableRowData[] {
  return Array.from({ length: count }, (_, i) => {
    const attendance = Math.random() > 0.15;
    const groupNum = Math.floor(i / 5) + 1;
    const ta = taNames[groupNum - 1] || taNames[0];

    const gdScore = attendance
      ? { fa: rand(0, 5), fb: rand(0, 5), fc: rand(0, 5), fd: rand(0, 5) }
      : { fa: 0, fb: 0, fc: 0, fd: 0 };

    const bonusAttempt = attendance && Math.random() > 0.5 ? 1 : 0;
    const bonusScore = {
      attempt: bonusAttempt,
      good: bonusAttempt ? rand(0, 3) : 0,
      followUp: bonusAttempt ? rand(0, 2) : 0,
    };

    const exerciseScore = {
      Submitted: attendance && Math.random() > 0.3,
      privateTest: attendance && Math.random() > 0.4,
    };

    const gdTotal = gdScore.fa + gdScore.fb + gdScore.fc + gdScore.fd;
    const bonusTotal = bonusScore.good + bonusScore.followUp;
    const exTotal = (exerciseScore.Submitted ? 5 : 0) + (exerciseScore.privateTest ? 5 : 0);
    const total = gdTotal + bonusTotal + exTotal + (attendance ? 5 : 0);

    return {
      id: i + 1,
      userId: 1000 + i,
      name: names[i % names.length],
      discordGlobalName: discordNames[i % discordNames.length],
      email: discordNames[i % discordNames.length],
      group: `Group ${groupNum}`,
      ta,
      attendance,
      gdScore,
      bonusScore,
      exerciseScore,
      week: weekNumber,
      total,
    };
  });
}

export const mockWeeks = [
  { id: 'mock-week-1', week: 1, type: 'GROUP_DISCUSSION', hasExercise: true, questions: ['What is Bitcoin?'], bonusQuestion: ['Explain PoW'], classroomAssignmentUrl: null, classroomInviteLink: null },
  { id: 'mock-week-2', week: 2, type: 'GROUP_DISCUSSION', hasExercise: true, questions: ['What are UTXOs?'], bonusQuestion: ['Explain Merkle trees'], classroomAssignmentUrl: null, classroomInviteLink: null },
  { id: 'mock-week-3', week: 3, type: 'GROUP_DISCUSSION', hasExercise: false, questions: ['Explain Script'], bonusQuestion: ['SegWit benefits'], classroomAssignmentUrl: null, classroomInviteLink: null },
  { id: 'mock-week-4', week: 4, type: 'GROUP_DISCUSSION', hasExercise: true, questions: ['What is a soft fork?'], bonusQuestion: ['Taproot overview'], classroomAssignmentUrl: null, classroomInviteLink: null },
  { id: 'mock-week-5', week: 5, type: 'GROUP_DISCUSSION', hasExercise: false, questions: ['Lightning basics'], bonusQuestion: ['HTLC routing'], classroomAssignmentUrl: null, classroomInviteLink: null },
  { id: 'mock-week-6', week: 6, type: 'GROUP_DISCUSSION', hasExercise: true, questions: ['P2P networking'], bonusQuestion: ['Eclipse attacks'], classroomAssignmentUrl: null, classroomInviteLink: null },
  { id: 'mock-week-7', week: 7, type: 'GROUP_DISCUSSION', hasExercise: false, questions: ['Mining pools'], bonusQuestion: ['Stratum V2'], classroomAssignmentUrl: null, classroomInviteLink: null },
  { id: 'mock-week-8', week: 8, type: 'GROUP_DISCUSSION', hasExercise: true, questions: ['Bitcoin privacy'], bonusQuestion: ['CoinJoin analysis'], classroomAssignmentUrl: null, classroomInviteLink: null },
];
