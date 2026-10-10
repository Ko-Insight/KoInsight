import { GetStatsSummaryResponse } from '@koinsight/common/types';
import { Request, Response, Router } from 'express';
import { BooksRepository } from '../books/books-repository';
import { StatsRepository } from './stats-repository';
import { StatsService } from './stats-service';

const router = Router();

function parseTimestampQueryParam(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const timestamp = Number(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/**
 * Get stats summary
 */
router.get('/', async (req: Request, res: Response) => {
  const books = await BooksRepository.getAllWithData();
  const totalPagesRead = StatsService.totalPagesRead(books);

  const stats = await StatsRepository.getAll();
  const requestedTimeZone = typeof req.query.time_zone === 'string' ? req.query.time_zone : 'UTC';
  const timeZone = StatsService.isValidTimeZone(requestedTimeZone) ? requestedTimeZone : 'UTC';
  const perMonth = StatsService.getPerMonthReadingTime(stats);
  const perDayOfTheWeek = StatsService.perDayOfTheWeek(stats);
  const dailyReadingStats = StatsService.dailyReadingStats(books, stats, timeZone);
  const totalReadingTime = StatsService.totalReadingTime(stats);
  const last7DaysReadTime = StatsService.last7DaysReadTime(stats);

  const response: GetStatsSummaryResponse = {
    perMonth,
    perDayOfTheWeek,
    mostPagesInADay: dailyReadingStats.mostPagesInADay,
    totalReadingTime,
    longestDay: dailyReadingStats.longestDay,
    last7DaysReadTime,
    currentDailyReadingStreak: dailyReadingStats.currentDailyReadingStreak,
    longestDailyReadingStreak: dailyReadingStats.longestDailyReadingStreak,
    totalPagesRead,
  };

  res.status(200).json(response);
});

/**
 * Get raw page stats
 */
router.get('/page-stats', async (req: Request, res: Response) => {
  const start = parseTimestampQueryParam(req.query.start);
  const end = parseTimestampQueryParam(req.query.end);
  const stats = await StatsRepository.getAll({ start, end });
  res.status(200).json(stats);
});

/**
 * Get stats by book md5
 */
router.get('/:book_md5', async (req: Request<{ book_md5: string }>, res: Response) => {
  const book_md5 = req.params.book_md5;
  const book = await StatsRepository.getByBookMD5(book_md5);
  res.status(200).json(book);
});

export { router as statsRouter };