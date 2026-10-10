import { Book, BookDevice, Device } from '@koinsight/common/types';
import { range } from 'ramda';
import { createBookDevice } from '../db/factories/book-device-factory';
import { createBook } from '../db/factories/book-factory';
import { createDevice } from '../db/factories/device-factory';
import { createPageStat } from '../db/factories/page-stat-factory';
import { db } from '../knex';
import { StatsService } from './stats-service';
import { startOfDay, subDays } from 'date-fns';

describe(StatsService, () => {
  let device: Device;
  let book: Book;
  let bookDevice: BookDevice;

  beforeEach(async () => {
    device = await createDevice(db);
    book = await createBook(db, { title: 'Test Book 1' });
    bookDevice = await createBookDevice(db, book, device, { pages: 100 });
  });

  describe(StatsService.getPerMonthReadingTime, () => {
    it('returns the correct reading time per month', async () => {
      const month1 = new Date('2025-02-03').getTime();
      const month2 = new Date('2025-04-03').getTime();

      const month1Stats = await Promise.all(
        range(0, 6).map(
          async (i) =>
            await createPageStat(db, book, bookDevice, device, {
              start_time: month1,
              duration: 10,
              page: i,
            })
        )
      );

      const month2Stats = await Promise.all(
        range(0, 2).map(
          async (i) =>
            await createPageStat(db, book, bookDevice, device, {
              start_time: month2,
              duration: 10,
              page: i,
            })
        )
      );

      const result = await StatsService.getPerMonthReadingTime([...month1Stats, ...month2Stats]);

      expect(result[0]).toEqual(
        expect.objectContaining({
          duration: 60,
          month: 'February 2025',
        })
      );

      expect(result[1]).toEqual(
        expect.objectContaining({
          duration: 20,
          month: 'April 2025',
        })
      );
    });

    it('returns an empty array with no stats', async () => {
      const result = await StatsService.getPerMonthReadingTime([]);
      expect(result).toEqual([]);
    });
  });

  describe(StatsService.totalReadingTime, () => {
    it('returns the correct total reading time', async () => {
      const stats = await Promise.all(
        range(0, 3).map(
          async (i) => await createPageStat(db, book, bookDevice, device, { duration: i * 10 })
        )
      );

      const result = await StatsService.totalReadingTime(stats);
      expect(result).toEqual(30);
    });

    it('returns 0 with no stats', async () => {
      const result = await StatsService.totalReadingTime([]);
      expect(result).toEqual(0);
    });
  });

  describe(StatsService.mostPagesInADay, () => {
    it('returns the correct most pages in a day', async () => {
      book = await createBook(db, { title: 'Test Book 1', reference_pages: undefined });

      const stats = await Promise.all(
        range(0, 3).map(
          async (i) =>
            await createPageStat(db, book, bookDevice, device, {
              start_time: new Date(2025, 1, 1 + i).getTime(),
            })
        )
      );

      stats.push(
        await createPageStat(db, book, bookDevice, device, {
          page: 10,
          start_time: new Date(2025, 1, 1).getTime(),
        })
      );

      stats.push(
        await createPageStat(db, book, bookDevice, device, {
          page: 11,
          start_time: new Date(2025, 1, 1).getTime(),
        })
      );

      const result = await StatsService.mostPagesInADay([book], stats);
      expect(result).toEqual({
        pages: 3,
        date: '2025-02-01',
      });
    });

    it('works with reference pages', async () => {
      book = await createBook(db, { title: 'Test Book 1', reference_pages: 200 });
      bookDevice = await createBookDevice(db, book, device, { pages: 400 });

      const stats = await Promise.all(
        range(0, 3).map(
          async (i) =>
            await createPageStat(db, book, bookDevice, device, {
              start_time: new Date(2025, 1, 1 + i).getTime(),
            })
        )
      );

      stats.push(
        await createPageStat(db, book, bookDevice, device, {
          page: 10,
          start_time: new Date(2025, 1, 1).getTime(),
        })
      );

      stats.push(
        await createPageStat(db, book, bookDevice, device, {
          page: 11,
          start_time: new Date(2025, 1, 1).getTime(),
        })
      );

      const result = await StatsService.mostPagesInADay([book], stats);
      expect(result.pages).toEqual(2); // result is rounded
    });

    it('returns 0 with no stats', async () => {
      const result = await StatsService.mostPagesInADay([book], []);
      expect(result).toEqual({ pages: 0 });
    });
  });

  describe(StatsService.longestDay, () => {
    it('returns the correct longest day', async () => {
      const stats = await Promise.all(
        range(0, 5).map(
          async (i) =>
            await createPageStat(db, book, bookDevice, device, {
              start_time: new Date(2025, 1, 1 + i).getTime(),
              duration: i * 10,
            })
        )
      );

      const result = await StatsService.longestDay(stats);
      expect(result).toEqual({
        duration: 40,
        date: '2025-02-05',
      });
    });

    it('returns 0 with no stats', async () => {
      const result = await StatsService.longestDay([]);
      expect(result).toEqual({ duration: 0 });
    });
  });

  describe(StatsService.last7DaysReadTime, () => {
    it('returns the correct last 7 days read time', async () => {
      const stats = await Promise.all(
        range(0, 10).map(
          async (i) =>
            await createPageStat(db, book, bookDevice, device, {
              start_time: subDays(new Date(), i).getTime(),
              duration: i * 10,
            })
        )
      );

      const result = await StatsService.last7DaysReadTime(stats);
      expect(result).toEqual(210);
    });

    it('returns 0 with no stats', async () => {
      const result = await StatsService.last7DaysReadTime([]);
      expect(result).toEqual(0);
    });
  });

  describe(StatsService.currentDailyReadingStreak, () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns streak ending today', () => {
      const today = startOfDay(new Date('2025-04-10T15:00:00.000Z')).getTime();
      vi.useFakeTimers();
      vi.setSystemTime(today);

      const stats = [0, 1, 2, 5].map((daysAgo, index) => ({
        page: index,
        start_time: subDays(today, daysAgo).getTime(),
        duration: 60,
        total_pages: 100,
        device_id: device.id,
        book_md5: book.md5,
      }));

      const result = StatsService.currentDailyReadingStreak(stats);
      expect(result).toEqual({ days: 3, start: '2025-04-08', end: '2025-04-10' });
    });

    it('returns streak ending yesterday when today has no reading activity', () => {
      const today = startOfDay(new Date('2025-04-10T15:00:00.000Z')).getTime();
      vi.useFakeTimers();
      vi.setSystemTime(today);

      const stats = [1, 2, 3].map((daysAgo, index) => ({
        page: index,
        start_time: subDays(today, daysAgo).getTime(),
        duration: 60,
        total_pages: 100,
        device_id: device.id,
        book_md5: book.md5,
      }));

      const result = StatsService.currentDailyReadingStreak(stats);
      expect(result).toEqual({ days: 3, start: '2025-04-07', end: '2025-04-09' });
    });

    it('returns 0 when neither today nor yesterday has reading activity', () => {
      const today = startOfDay(new Date('2025-04-10T15:00:00.000Z')).getTime();
      vi.useFakeTimers();
      vi.setSystemTime(today);

      const stats = [2, 3, 4].map((daysAgo, index) => ({
        page: index,
        start_time: subDays(today, daysAgo).getTime(),
        duration: 60,
        total_pages: 100,
        device_id: device.id,
        book_md5: book.md5,
      }));

      const result = StatsService.currentDailyReadingStreak(stats);
      expect(result).toEqual({ days: 0 });
    });

    it('returns current streak when a historical streak is longer', () => {
      const today = startOfDay(new Date('2025-04-10T15:00:00.000Z')).getTime();
      vi.useFakeTimers();
      vi.setSystemTime(today);

      const stats = [1, 2, 5, 6, 7, 8, 9].map((daysAgo, index) => ({
        page: index,
        start_time: subDays(today, daysAgo).getTime(),
        duration: 60,
        total_pages: 100,
        device_id: device.id,
        book_md5: book.md5,
      }));

      expect(StatsService.currentDailyReadingStreak(stats)).toEqual({
        days: 2,
        start: '2025-04-08',
        end: '2025-04-09',
      });
      expect(StatsService.longestDailyReadingStreak(stats).days).toEqual(5);
    });

    it('uses the requested timezone to decide whether a streak is current', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-30T15:00:00.000Z'));

      const stats = [0, 1, 2].map((daysAgo, index) => ({
        page: index,
        start_time: subDays(new Date('2026-07-29T02:00:00.000Z'), daysAgo).getTime(),
        duration: 60,
        total_pages: 100,
        device_id: device.id,
        book_md5: book.md5,
      }));

      expect(StatsService.longestDailyReadingStreak(stats, 'America/Toronto')).toEqual({
        days: 3,
        start: '2026-07-26',
        end: '2026-07-28',
      });
      expect(StatsService.currentDailyReadingStreak(stats, 'America/Toronto')).toEqual({ days: 0 });
      expect(StatsService.currentDailyReadingStreak(stats, 'UTC')).toEqual({
        days: 3,
        start: '2026-07-27',
        end: '2026-07-29',
      });
    });

    it('returns current streak when a historical streak is longer', () => {
      const today = startOfDay(new Date('2025-04-10T15:00:00.000Z')).getTime();
      vi.useFakeTimers();
      vi.setSystemTime(today);

      const stats = [1, 2, 5, 6, 7, 8, 9].map((daysAgo, index) => ({
        page: index,
        start_time: subDays(today, daysAgo).getTime(),
        duration: 60,
        total_pages: 100,
        device_id: device.id,
        book_md5: book.md5,
      }));

      expect(StatsService.currentDailyReadingStreak(stats)).toEqual({
        days: 2,
        start: '2025-04-08',
        end: '2025-04-09',
      });
      expect(StatsService.longestDailyReadingStreak(stats).days).toEqual(5);
    });

    it('uses the requested timezone to decide whether a streak is current', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-30T15:00:00.000Z'));

      const stats = [0, 1, 2].map((daysAgo, index) => ({
        page: index,
        start_time: subDays(new Date('2026-07-29T02:00:00.000Z'), daysAgo).getTime(),
        duration: 60,
        total_pages: 100,
        device_id: device.id,
        book_md5: book.md5,
      }));

      expect(StatsService.longestDailyReadingStreak(stats, 'America/Toronto')).toEqual({
        days: 3,
        start: '2026-07-26',
        end: '2026-07-28',
      });
      expect(StatsService.currentDailyReadingStreak(stats, 'America/Toronto')).toEqual({ days: 0 });
      expect(StatsService.currentDailyReadingStreak(stats, 'UTC')).toEqual({
        days: 3,
        start: '2026-07-27',
        end: '2026-07-29',
      });
    });
  });

  describe(StatsService.longestDailyReadingStreak, () => {
    it('returns the longest consecutive daily streak', () => {
      const anchor = startOfDay(new Date('2025-04-10T15:00:00.000Z')).getTime();
      const stats = [0, 1, 2, 4, 6, 7, 8, 9].map((daysAgo, index) => ({
        page: index,
        start_time: subDays(anchor, daysAgo).getTime(),
        duration: 60,
        total_pages: 100,
        device_id: device.id,
        book_md5: book.md5,
      }));

      const result = StatsService.longestDailyReadingStreak(stats);
      expect(result).toEqual({
        days: 4,
        start: '2025-04-01',
        end: '2025-04-04',
      });
    });

    it('returns 0 with no stats', () => {
      const result = StatsService.longestDailyReadingStreak([]);
      expect(result).toEqual({ days: 0 });
    });
  });

  describe(StatsService.perDayOfTheWeek, () => {
    // FIXME: Flaky - Depends on locale
    it.skip('returns the correct per day of the week', async () => {
      const stats = await Promise.all(
        range(0, 10).map(
          async (i) =>
            await createPageStat(db, book, bookDevice, device, {
              start_time: new Date(2025, 1, 1 + i).getTime(),
              duration: i * 10,
            })
        )
      );

      const result = await StatsService.perDayOfTheWeek(stats);
      expect(result).toEqual([
        { day: 0, name: 'Monday', value: 110 },
        { day: 1, name: 'Tuesday', value: 30 },
        { day: 2, name: 'Wednesday', value: 40 },
        { day: 3, name: 'Thursday', value: 50 },
        { day: 4, name: 'Friday', value: 60 },
        { day: 5, name: 'Saturday', value: 70 },
        { day: 6, name: 'Sunday', value: 90 },
      ]);
    });

    it('returns an empty array with no stats', async () => {
      const result = await StatsService.perDayOfTheWeek([]);
      expect(result).toEqual([]);
    });
  });
});
