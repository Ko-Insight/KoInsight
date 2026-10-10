import { Flex } from '@mantine/core';
import { endOfDay, formatDate, startOfDay, subDays } from 'date-fns';
import { JSX, useMemo } from 'react';
import { usePageStats } from '../../api/use-page-stats';
import { formatSecondsToHumanReadable } from '../../utils/dates';
import { DayData, DotTrail } from '../dot-trail/dot-trail';

export function ReadingCalendar(): JSX.Element {
  const today = endOfDay(new Date()).getTime();
  const start = startOfDay(subDays(today, 750)).getTime();
  const { data: stats } = usePageStats({ start, end: today });

  const percentPerDay: Record<number, DayData> = useMemo(() => {
    const timePerDay = stats.reduce<Record<number, number>>((acc, stat) => {
      const day = startOfDay(stat.start_time).getTime();
      acc[day] = (acc[day] || 0) + stat.duration;
      return acc;
    }, {});

    const maxTime = Math.max(...Object.values(timePerDay ?? {}));

    return Object.entries(timePerDay ?? {}).reduce<Record<number, DayData>>((acc, [day, time]) => {
      acc[Number(day)] = {
        percent: Math.floor((time / maxTime) * 100),
        tooltip: (
          <>
            {formatSecondsToHumanReadable(time)} read on{' '}
            {formatDate(new Date(Number(day)), 'dd MMM yyyy')}
          </>
        ),
      };
      return acc;
    }, {});
  }, [stats]);

  return (
    <Flex style={{ width: '100%' }} justify="center" align="center">
      <DotTrail percentPerDay={percentPerDay} />
    </Flex>
  );
}