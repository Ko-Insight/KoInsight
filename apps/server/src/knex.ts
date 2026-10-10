import knex, { Knex } from 'knex';
import { appConfig } from './config';
import config from './knexfile';

const environment = appConfig.env || 'development';
export const db: Knex = knex(config[environment] ?? config.development);
