import { Button, Flex } from '@mantine/core';
import { MonthPickerInput } from '@mantine/dates';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import clsx from 'clsx';
import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { endOfMonth } from 'date-fns/endOfMonth';
import { endOfWeek } from 'date-fns/endOfWeek';
import { format } from 'date-fns/format';
import { isSameMonth } from 'date-fns/isSameMonth';
import { isToday } from 'date-fns/isToday';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { subMonths } from 'date-fns/subMonths';
import { JSX, ReactNode, useEffect, useState } from 'react';
import { CalendarWeek } from './calendar-week';

import style from './calendar.module.css';

export type CalendarEvent<T> = {
  date: Date;
  title?: string;
  data?: T;
};

export type CalendarProps<T> = {
  events: Record<string, CalendarEvent<T>>;
  dayRenderer?: (data: T) => ReactNode;
  onDateRangeChange?: (range: { start: number; end: number }) => void;
};

function getMonthAnchor(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function formatMonthValue(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  return `${year}-${month}-01`;
}

function parseMonthValue(value: string | null) {
  if (!value) {
    return undefined;
  }

  const [year, month] = value.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return undefined;
  }

  return new Date(year, month - 1, 1, 12);
}

export function Calendar<T>({
  events,
  dayRenderer,
  onDateRangeChange,
}: CalendarProps<T>): JSX.Element {
  const [currentDate, setCurrentDate] = useState(() => getMonthAnchor(new Date()));

  const startDate = startOfWeek(startOfMonth(currentDate), {
    locale: { options: { weekStartsOn: 1 } },
  });
  const endDate = endOfWeek(endOfMonth(currentDate), { locale: { options: { weekStartsOn: 1 } } });
  const startTimestamp = startDate.getTime();
  const endTimestamp = endDate.getTime();
  const dates = [];

  useEffect(() => {
    onDateRangeChange?.({ start: startTimestamp, end: endTimestamp });
  }, [endTimestamp, onDateRangeChange, startTimestamp]);

  let day = startDate;
  while (day <= endDate) {
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isCurrentDay = isToday(day);
    const key = day.toISOString();
    const event = events[key];
    const dayNum = format(day, 'd');

    dates.push(
      <div
        className={clsx(
          style.CalendarDate,
          !isCurrentMonth && style.CalendarDateDisabled,
          isCurrentDay && style.CalendarDateToday
        )}
        key={key}
      >
        <div className={style.CalendarDay}>{event ? <strong>{dayNum}</strong> : dayNum}</div>
        {event && (
          <>
            <div className={style.CalendarEvent}>
              {event.title}
              {event?.data && dayRenderer?.(event.data!)}
            </div>
          </>
        )}
      </div>
    );
    day = addDays(day, 1);
  }

  function bindShortcuts(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setCurrentDate((date) => getMonthAnchor(subMonths(date, 1)));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setCurrentDate((date) => getMonthAnchor(addMonths(date, 1)));
        break;
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', bindShortcuts);
    return () => {
      window.removeEventListener('keydown', bindShortcuts);
    };
  });

  return (
    <div className={style.Calendar}>
      <div className={style.CalendarHeader}>
        <Flex gap="xs" align="center">
          <Button
            size="xs"
            variant="light"
            color="violet"
            onClick={() => setCurrentDate((date) => getMonthAnchor(subMonths(date, 1)))}
          >
            <IconArrowLeft size={16} />
          </Button>

          <Button size="xs" variant="default" onClick={() => setCurrentDate(getMonthAnchor(new Date()))}>
            Today
          </Button>
          <MonthPickerInput
            size="xs"
            value={formatMonthValue(currentDate)}
            onChange={(value) => {
              const selectedMonth = parseMonthValue(value);
              if (selectedMonth) {
                setCurrentDate(selectedMonth);
              }
            }}
          />
        </Flex>
        <Button
          size="xs"
          color="violet"
          variant="light"
          onClick={() => setCurrentDate((date) => getMonthAnchor(addMonths(date, 1)))}
        >
          <IconArrowRight size={16} />
        </Button>
      </div>
      <CalendarWeek currentDate={currentDate} />
      <div className={style.CalendarGrid}>{dates}</div>
    </div>
  );
}