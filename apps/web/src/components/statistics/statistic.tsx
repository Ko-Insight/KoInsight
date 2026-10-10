import { ComponentType, JSX } from 'react';

import { Group, Paper, Text } from '@mantine/core';

import style from './statistic.module.css';

export type StatisticProps = {
  label: string;
  value: string | number;
  detail?: string;
  icon: ComponentType<{ size: number; stroke: number; className: string }>;
};

export function Statistic({ label, value, detail, icon: Icon }: StatisticProps): JSX.Element {
  return (
    <Paper withBorder p="md" radius="md" key={label}>
      <Group justify="space-between">
        <Text size="xs" c="dimmed" fw={700} className={style.Title}>
          {label}
        </Text>
        <Icon className={style.Icon} size={22} stroke={1.5} />
      </Group>

      <Group align="flex-end" gap="xs" mt={25}>
        <p className={style.Value}>{value}</p>
      </Group>

      <Text
        fz="xs"
        c="dimmed"
        mt={7}
        className={detail ? style.Detail : `${style.Detail} ${style.DetailEmpty}`}
      >
        {detail ?? 'No detail'}
      </Text>
    </Paper>
  );
}
