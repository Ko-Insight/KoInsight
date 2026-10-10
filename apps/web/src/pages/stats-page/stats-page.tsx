import { Book } from '@koinsight/common/types/book';
import { BarChart } from '@mantine/charts';
import {
  Box,
  Flex,
  Loader,
  Text,
  Title,
  useComputedColorScheme,
  useMantineTheme,
} from '@mantine/core';
import {
  IconFiles,
  IconFileStar,
  IconClock,
  IconClockStar,
  IconFlame,
  IconTrophy,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { JSX, useMemo } from 'react';
import { BarProps } from 'recharts';
import { useBooks } from '../../api/books';
import { useStatsSummary } from '../../api/use-page-stats';
import { CustomBar } from '../../components/charts/custom-bar';
import { ReadingCalendar } from '../../components/statistics/reading-calendar';
import { Statistics } from '../../components/statistics/statistics';
import { formatSecondsToHumanReadable } from '../../utils/dates';
import { WeekStats } from './week-stats';

export function StatsPage(): JSX.Element {
  const colorScheme = useComputedColorScheme();
  const { colors } = useMantineTheme();
  const { data: books, isLoading: booksLoading } = useBooks();

  const {
    data: {
      perMonth,
      perDayOfTheWeek,
      mostPagesInADay,
      totalReadingTime,
      longestDay,
      last7DaysReadTime,
      currentDailyReadingStreak,
      longestDailyReadingStreak,
      totalPagesRead,
    },
    isLoading: statsLoading,
  } = useStatsSummary();

  const booksByMd5 = useMemo(() => {
    return books?.reduce(
      (acc, book) => {
        acc[book.md5] = book;
        return acc;
      },
      {} as Record<string, Book>
    );
  }, [books]);

  const formatStreakDays = (value: number) => `${value} day${value === 1 ? '' : 's'}`;
  const formatLocalizedNumber = (value: number) => new Intl.NumberFormat().format(value);

  const formatDateKey = (dateKey?: string) =>
    dateKey ? format(new Date(`${dateKey}T12:00:00`), 'MMM d, yyyy') : 'No reading data yet';

  const formatDateRange = (dateRange?: { start?: string; end?: string }) =>
    dateRange?.start && dateRange.end
      ? `${formatDateKey(dateRange.start)} - ${formatDateKey(dateRange.end)}`
      : 'N/A';

  const formatStartedOn = (dateKey?: string) =>
    dateKey ? `Started on ${formatDateKey(dateKey)}` : undefined;

  if (booksLoading || statsLoading) {
    return (
      <Flex justify="center" align="center" h="100%">
        <Loader />
      </Flex>
    );
  }

  return (
    <>
      <Title mb="sm">Reading statistics</Title>
      <Text
        mt={4}
        mb="md"
        style={{ display: 'inline' }}
        variant="gradient"
        gradient={{
          from: colorScheme === 'dark' ? 'violet.4' : 'violet.8',
          to: colorScheme === 'dark' ? 'koinsight.5' : 'koinsight.8',
          deg: 120,
        }}
        fw={900}
      >
        {last7DaysReadTime > 0 ? (
          <>You read for {formatSecondsToHumanReadable(last7DaysReadTime)} this week. Keep it up!</>
        ) : (
          <>You haven't read this week yet. No better time to start!</>
        )}
      </Text>
      <Box my="xl">
        <Statistics
          data={[
            {
              label: 'Total read time',
              value: formatSecondsToHumanReadable(totalReadingTime),
              icon: IconClock,
            },
            {
              label: 'Total pages read',
              value: formatLocalizedNumber(totalPagesRead),
              icon: IconFiles,
            },
            {
              label: 'Longest time reading in a day',
              value: formatSecondsToHumanReadable(longestDay.duration),
              detail: formatDateKey(longestDay.date),
              icon: IconClockStar,
            },
            {
              label: 'Most pages in a day',
              value:
                mostPagesInADay.pages !== null && mostPagesInADay.pages !== undefined
                  ? formatLocalizedNumber(mostPagesInADay.pages)
                  : 'N/A',
              detail: formatDateKey(mostPagesInADay.date),
              icon: IconFileStar,
            },
            {
              label: 'Current Daily Reading Streak',
              value: formatStreakDays(currentDailyReadingStreak.days),
              detail: formatStartedOn(currentDailyReadingStreak.start),
              icon: IconFlame,
            },
            {
              label: 'Longest Daily Reading Streak',
              value: formatStreakDays(longestDailyReadingStreak.days),
              detail: formatDateRange(longestDailyReadingStreak),
              icon: IconTrophy,
            },
          ]}
        />
      </Box>
      <Title mb="xl" order={3}>
        Reading history
      </Title>
      <Box mb="xl">
        <ReadingCalendar />
      </Box>
      <Title mt="xl" mb={4} order={3}>
        Weekly stats
      </Title>
      <WeekStats booksByMd5={booksByMd5} />
      <Title mt="xl" order={3}>
        Per day of the week
      </Title>
      <BarChart
        h={300}
        data={perDayOfTheWeek}
        dataKey="name"
        series={[
          {
            name: 'value',
            label: 'Reading time',
            color: colorScheme === 'dark' ? 'koinsight.7' : 'koinsight.1',
          },
        ]}
        gridAxis="none"
        withYAxis={false}
        barProps={{
          maxBarSize: 100,
          shape: (props: BarProps) => (
            <CustomBar
              {...props}
              accent={colorScheme === 'dark' ? colors.koinsight[2] : colors.koinsight[8]}
            />
          ),
        }}
        valueFormatter={(value) => formatSecondsToHumanReadable(value)}
      />
      <Title mt="xl" order={3}>
        Monthly reading time
      </Title>
      <BarChart
        h={300}
        mt="sm"
        data={perMonth}
        dataKey="month"
        gridAxis="none"
        withYAxis={false}
        barProps={{
          maxBarSize: 100,
          shape: (props: BarProps) => (
            <CustomBar
              {...props}
              accent={colorScheme === 'dark' ? colors.violet[2] : colors.violet[8]}
            />
          ),
        }}
        valueFormatter={(value) => formatSecondsToHumanReadable(value)}
        series={[
          {
            name: 'duration',
            label: 'Reading time',
            color: colorScheme === 'dark' ? 'violet.7' : 'violet.1',
          },
        ]}
      />
    </>
  );
}
