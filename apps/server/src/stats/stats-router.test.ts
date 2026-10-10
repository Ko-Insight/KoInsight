import express from 'express';
import request from 'supertest';
import { createDevice } from '../db/factories/device-factory';
import { db } from '../knex';
import { statsRouter } from './stats-router';
import { createBook } from '../db/factories/book-factory';
import { createBookDevice } from '../db/factories/book-device-factory';
import { createPageStat } from '../db/factories/page-stat-factory';
import { Book, BookDevice, Device } from '@koinsight/common/types';

describe('GET /stats', () => {
  const app = express();
  app.use(express.json());
  app.use('/stats', statsRouter);

  let device: Device;
  let book: Book;
  let bookDevice: BookDevice;

  beforeEach(async () => {
    device = await createDevice(db, { model: 'Device 1' });
    book = await createBook(db, { reference_pages: 100 });
    bookDevice = await createBookDevice(db, book, device, { pages: 100 });
  });

  it('returns stats summary', async () => {
    await createPageStat(db, book, bookDevice, device, { duration: 10, page: 1 });
    await createPageStat(db, book, bookDevice, device, { duration: 20, page: 2 });
    await createPageStat(db, book, bookDevice, device, { duration: 10, page: 3 });
    await createPageStat(db, book, bookDevice, device, { duration: 20, page: 4 });

    const response = await request(app).get('/stats');
    const body = response.body;

    expect(response.status).toBe(200);

    // TODO: Do we need a more detailed test here provided everything is from the StatsService?
    expect(body).toHaveProperty('perMonth');
    expect(body).not.toHaveProperty('stats');
    expect(body.longestDay.duration).toBe(20);
    expect(body.mostPagesInADay).toHaveProperty('pages');
    expect(body.totalPagesRead).toBe(4);
    expect(body).toHaveProperty('currentDailyReadingStreak');
    expect(body.longestDailyReadingStreak).toHaveProperty('days');
  });

  it('returns raw page stats from the page-stats endpoint', async () => {
    await createPageStat(db, book, bookDevice, device, { duration: 10, page: 1 });
    await createPageStat(db, book, bookDevice, device, { duration: 20, page: 2 });

    const response = await request(app).get('/stats/page-stats');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty('start_time');
  });

  it('filters raw page stats by start and end timestamps', async () => {
    const inRange = new Date('2025-01-15T12:00:00.000Z').getTime();
    const outOfRange = new Date('2025-02-15T12:00:00.000Z').getTime();

    await createPageStat(db, book, bookDevice, device, {
      duration: 10,
      page: 1,
      start_time: inRange / 1000,
    });
    await createPageStat(db, book, bookDevice, device, {
      duration: 20,
      page: 2,
      start_time: outOfRange / 1000,
    });

    const response = await request(app).get(
      `/stats/page-stats?start=${new Date('2025-01-01T00:00:00.000Z').getTime()}&end=${new Date(
        '2025-01-31T23:59:59.999Z'
      ).getTime()}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].page).toBe(1);
    expect(response.body[0].start_time).toBe(inRange);
  });
});