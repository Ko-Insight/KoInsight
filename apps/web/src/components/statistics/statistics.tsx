import { Group } from '@mantine/core';
import { JSX } from 'react';
import { Statistic, StatisticProps } from './statistic';

import style from './statistics.module.css';

type StatisticsProps = {
  data: StatisticProps[];
};

export function Statistics({ data }: StatisticsProps): JSX.Element {
  return (
    <Group gap="md" className={style.statistics}>
      {data.map((stat) => (
        <Statistic
          key={stat.label}
          label={stat.label}
          value={stat.value}
          detail={stat.detail}
          icon={stat.icon}
        />
      ))}
    </Group>
  );
}
