import { GetStatsSummaryResponse, PageStat } from '@koinsight/common/types';
import useSWR from 'swr';
import { fetchFromAPI } from './api';

export function useStatsSummary() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useSWR(
    ['stats', timeZone],
    () => fetchFromAPI<GetStatsSummaryResponse>('stats', 'GET', { time_zone: timeZone }),
    {
      fallbackData: {
        perMonth: [],
        perDayOfTheWeek: [],
        mostPagesInADay: { pages: 0 },
        totalReadingTime: 0,
        longestDay: { duration: 0 },
        last7DaysReadTime: 0,
        currentDailyReadingStreak: { days: 0 },
        longestDailyReadingStreak: { days: 0 },
        totalPagesRead: 0,
      },
    }
  );
}

type PageStatsRange = {
  start?: number;
  end?: number;
};

export function usePageStats(range: PageStatsRange = {}) {
  const query = Object.fromEntries(
    Object.entries(range).filter(([, value]) => value !== undefined)
  );

  return useSWR(
    ['stats/page-stats', range.start, range.end],
    () => fetchFromAPI<PageStat[]>('stats/page-stats', 'GET', query),
    {
      fallbackData: [],
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
}

export function useBookStats(bookMd5: string) {
  return useSWR(`stats/${bookMd5}`, () => fetchFromAPI<PageStat[]>(`stats/${bookMd5}`));
}