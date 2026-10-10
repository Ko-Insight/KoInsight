export type PerMonthReadingTime = {
  month: string;
  duration: number;
  // FIXME: Date is used for sorting. Can just pass startOfMonth timestamp and format date in UI.
  date: number;
};

export type PerDayOfTheWeek = {
  name: string;
  value: number;
  day: number;
};

export type ReadingPageStat = {
  pages: number;
  date?: string;
};

export type ReadingDayStat = {
  duration: number;
  date?: string;
};

export type DailyReadingStreak = {
  days: number;
  start?: string;
  end?: string;
};

export type GetStatsSummaryResponse = {
  perMonth: PerMonthReadingTime[];
  perDayOfTheWeek: PerDayOfTheWeek[];
  mostPagesInADay: ReadingPageStat;
  totalReadingTime: number;
  longestDay: ReadingDayStat;
  last7DaysReadTime: number;
  currentDailyReadingStreak: DailyReadingStreak;
  longestDailyReadingStreak: DailyReadingStreak;
  totalPagesRead: number;
};