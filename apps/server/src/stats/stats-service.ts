import {
  Book,
  BookWithData,
  DailyReadingStreak,
  PageStat,
  PerDayOfTheWeek,
  PerMonthReadingTime,
  ReadingDayStat,
  ReadingPageStat,
} from '@koinsight/common/types';
import { differenceInCalendarDays, format, subDays } from 'date-fns';
import { sum } from 'ramda';

type DateKeyContext = {
  formatter: Intl.DateTimeFormat;
  offsetsByUtcHour: Map<number, number>;
};

type DailyStatsSummary = {
  mostPagesInADay: ReadingPageStat;
  longestDay: ReadingDayStat;
  currentDailyReadingStreak: DailyReadingStreak;
  longestDailyReadingStreak: DailyReadingStreak;
};

type ReadingDayTotals = {
  duration: number;
  pages: number;
};

export class StatsService {
  private static dateKeyFormatters = new Map<string, Intl.DateTimeFormat>();
  private static dateKeyOffsetsByTimeZone = new Map<string, Map<number, number>>();

  static isValidTimeZone(timeZone: string) {
    try {
      this.getDateKeyFormatter(timeZone);
      return true;
    } catch {
      return false;
    }
  }
  static getPerMonthReadingTime(stats: PageStat[]): PerMonthReadingTime[] {
    const perMonth = (stats ?? [])
      .reduce<PerMonthReadingTime[]>((acc, stat) => {
        const month = format(stat.start_time, 'MMMM yyyy');
        const monthData = acc.find((item) => item.month === month);
        if (monthData) {
          monthData.duration += stat.duration;
        } else {
          acc.push({ month, duration: stat.duration, date: stat.start_time });
        }

        return acc;
      }, [])
      .sort((a, b) => a.date - b.date);

    return perMonth;
  }

  static perDayOfTheWeek(stats: PageStat[]): PerDayOfTheWeek[] {
    return stats
      .reduce((acc, stat) => {
        const day = format(stat.start_time, 'EEEE');
        const existingDay = acc.find((d) => d.name === day);
        if (existingDay) {
          existingDay.value += stat.duration;
        } else {
          acc.push({
            name: day,
            value: stat.duration,
            day: new Date(stat.start_time).getUTCDay(),
          });
        }
        return acc;
      }, [] as PerDayOfTheWeek[])
      .sort((a, b) => a.day - b.day);
  }

  static dailyReadingStats(books: Book[], stats: PageStat[], timeZone = 'UTC'): DailyStatsSummary {
    const context = this.getDateKeyContext(timeZone);
    const totalsByDay = this.getReadingDayTotals(stats, books, context);
    const uniqueDays = Array.from(totalsByDay.keys()).sort();
    const longestDailyReadingStreak = this.getLongestDailyReadingStreak(uniqueDays) ?? { days: 0 };
    const today = this.getDateKey(Date.now(), context);

    return {
      mostPagesInADay: this.getMostPagesInADay(totalsByDay),
      longestDay: this.getLongestDay(totalsByDay),
      currentDailyReadingStreak: this.getCurrentDailyReadingStreak(uniqueDays, today),
      longestDailyReadingStreak,
    };
  }

  static mostPagesInADay(books: Book[], stats: PageStat[], timeZone = 'UTC'): ReadingPageStat {
    const context = this.getDateKeyContext(timeZone);
    return this.getMostPagesInADay(this.getReadingDayTotals(stats, books, context));
  }

  static totalReadingTime(stats: PageStat[]) {
    return sum((stats ?? []).map((s) => s.duration));
  }

  static longestDay(stats: PageStat[], timeZone = 'UTC'): ReadingDayStat {
    const context = this.getDateKeyContext(timeZone);
    return this.getLongestDay(this.getReadingDayTotals(stats, [], context));
  }

  static last7DaysReadTime(stats: PageStat[]) {
    const sevenDaysAgo = subDays(new Date(), 7);
    const lastSevenDays = stats.filter((stat) => stat.start_time > sevenDaysAgo.getTime());
    return sum(lastSevenDays.map((s) => s.duration));
  }

  static currentDailyReadingStreak(stats: PageStat[], timeZone = 'UTC'): DailyReadingStreak {
    if (!stats?.length) {
      return { days: 0 };
    }

    const context = this.getDateKeyContext(timeZone);
    const today = this.getDateKey(Date.now(), context);
    const uniqueDays = this.getUniqueReadingDays(stats, context);

    return this.getCurrentDailyReadingStreak(uniqueDays, today);
  }

  static longestDailyReadingStreak(stats: PageStat[], timeZone = 'UTC'): DailyReadingStreak {
    const context = this.getDateKeyContext(timeZone);
    const uniqueDays = this.getUniqueReadingDays(stats, context);
    const longestStreak = this.getLongestDailyReadingStreak(uniqueDays);

    if (!longestStreak) {
      return { days: 0 };
    }

    return longestStreak;
  }

  static totalPagesRead(books: BookWithData[]) {
    return books.reduce((acc, book) => acc + book.total_read_pages, 0);
  }

  private static getUniqueReadingDays(stats: PageStat[], context: DateKeyContext) {
    return Array.from(new Set(stats.map((stat) => this.getDateKey(stat.start_time, context)))).sort();
  }

  private static getLongestDailyReadingStreak(uniqueDays: string[]) {
    if (!uniqueDays.length) {
      return undefined;
    }

    let longestStreak = {
      start: uniqueDays[0],
      end: uniqueDays[0],
      days: 1,
    };

    let currentStreak = { ...longestStreak };

    for (let i = 1; i < uniqueDays.length; i += 1) {
      if (
        differenceInCalendarDays(
          this.dateKeyToDate(uniqueDays[i]),
          this.dateKeyToDate(uniqueDays[i - 1])
        ) === 1
      ) {
        currentStreak.end = uniqueDays[i];
        currentStreak.days += 1;
      } else {
        if (currentStreak.days > longestStreak.days) {
          longestStreak = { ...currentStreak };
        }

        currentStreak = {
          start: uniqueDays[i],
          end: uniqueDays[i],
          days: 1,
        };
      }
    }

    if (currentStreak.days > longestStreak.days) {
      longestStreak = { ...currentStreak };
    }

    return longestStreak;
  }

  private static getCurrentDailyReadingStreak(uniqueDays: string[], today: string): DailyReadingStreak {
    const currentUniqueDays = uniqueDays.filter((day) => day <= today);
    const latestReadingDay = currentUniqueDays[currentUniqueDays.length - 1];

    if (
      latestReadingDay === undefined ||
      differenceInCalendarDays(this.dateKeyToDate(today), this.dateKeyToDate(latestReadingDay)) > 1
    ) {
      return { days: 0 };
    }

    const readingDays = new Set(currentUniqueDays);
    let streak = 0;
    let currentDay = latestReadingDay;
    let start = latestReadingDay;

    while (readingDays.has(currentDay)) {
      streak += 1;
      start = currentDay;
      currentDay = this.previousDateKey(currentDay);
    }

    return {
      days: streak,
      start,
      end: latestReadingDay,
    };
  }

  private static getReadingDayTotals(
    stats: PageStat[],
    books: Book[],
    context: DateKeyContext
  ): Map<string, ReadingDayTotals> {
    const booksByMd5 = books?.reduce(
      (acc, book) => {
        acc[book.md5] = book;
        return acc;
      },
      {} as Record<string, Book>
    );
    const totalsByDay = new Map<string, ReadingDayTotals>();

    stats.forEach((stat) => {
      const day = this.getDateKey(stat.start_time, context);
      const dayTotals = totalsByDay.get(day) ?? { duration: 0, pages: 0 };
      dayTotals.duration += stat.duration;
      dayTotals.pages += this.getStatPageCount(stat, booksByMd5);
      totalsByDay.set(day, dayTotals);
    });

    return totalsByDay;
  }

  private static getMostPagesInADay(totalsByDay: Map<string, ReadingDayTotals>): ReadingPageStat {
    let maxPagesDay: [string, ReadingDayTotals] | undefined;

    totalsByDay.forEach((totals, day) => {
      if (!maxPagesDay || totals.pages > maxPagesDay[1].pages) {
        maxPagesDay = [day, totals];
      }
    });

    if (!maxPagesDay) {
      return { pages: 0 };
    }

    return {
      pages: Math.max(0, Math.round(maxPagesDay[1].pages)),
      date: maxPagesDay[0],
    };
  }

  private static getLongestDay(totalsByDay: Map<string, ReadingDayTotals>): ReadingDayStat {
    let longestDay: [string, ReadingDayTotals] | undefined;

    totalsByDay.forEach((totals, day) => {
      if (!longestDay || totals.duration > longestDay[1].duration) {
        longestDay = [day, totals];
      }
    });

    if (!longestDay) {
      return { duration: 0 };
    }

    return {
      duration: Math.max(0, longestDay[1].duration),
      date: longestDay[0],
    };
  }

  private static getStatPageCount(stat: PageStat, booksByMd5: Record<string, Book>) {
    const referencePages = booksByMd5[stat.book_md5]?.reference_pages;
    if (stat.total_pages && referencePages) {
      return (1 / stat.total_pages) * referencePages;
    }

    return 1;
  }

  private static getDateKeyContext(timeZone: string): DateKeyContext {
    let offsetsByUtcHour = this.dateKeyOffsetsByTimeZone.get(timeZone);
    if (!offsetsByUtcHour) {
      offsetsByUtcHour = new Map();
      this.dateKeyOffsetsByTimeZone.set(timeZone, offsetsByUtcHour);
    }

    return {
      formatter: this.getDateKeyFormatter(timeZone),
      offsetsByUtcHour,
    };
  }

  private static getDateKeyFormatter(timeZone: string) {
    const existingFormatter = this.dateKeyFormatters.get(timeZone);
    if (existingFormatter) {
      return existingFormatter;
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    this.dateKeyFormatters.set(timeZone, formatter);

    return formatter;
  }

  private static getDateKey(timestamp: number, context: DateKeyContext) {
    const offset = this.getTimeZoneOffset(timestamp, context);
    const localDate = new Date(timestamp + offset);
    const year = localDate.getUTCFullYear().toString().padStart(4, '0');
    const month = (localDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = localDate.getUTCDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private static getTimeZoneOffset(timestamp: number, context: DateKeyContext) {
    const utcHour = Math.floor(timestamp / 3_600_000);
    const existingOffset = context.offsetsByUtcHour.get(utcHour);
    if (existingOffset !== undefined) {
      return existingOffset;
    }

    const roundedTimestamp = timestamp - (timestamp % 1000);
    const parts = context.formatter.formatToParts(new Date(roundedTimestamp));
    const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    const localTimestampAsUtc = Date.UTC(
      valueFor('year'),
      valueFor('month') - 1,
      valueFor('day'),
      valueFor('hour'),
      valueFor('minute'),
      valueFor('second')
    );
    const offset = localTimestampAsUtc - roundedTimestamp;

    context.offsetsByUtcHour.set(utcHour, offset);

    return offset;
  }

  private static dateKeyToDate(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  private static previousDateKey(dateKey: string) {
    return subDays(this.dateKeyToDate(dateKey), 1).toISOString().slice(0, 10);
  }
}
