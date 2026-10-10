import { PageStat } from '@koinsight/common/types/page-stat';
import { db } from '../knex';

export class StatsRepository {
  private static updateStartTime(stat: PageStat): PageStat {
    return { ...stat, start_time: stat.start_time * 1000 };
  }

  static async getAll({
    start,
    end,
  }: { start?: number; end?: number } = {}): Promise<PageStat[]> {
    const query = db<PageStat>('page_stat')
      .join('book', 'page_stat.book_md5', 'book.md5')
      .where({ 'book.soft_deleted': false })
      .select('page_stat.*');

    if (start !== undefined) {
      query.where('page_stat.start_time', '>=', Math.floor(start / 1000));
    }

    if (end !== undefined) {
      query.where('page_stat.start_time', '<=', Math.ceil(end / 1000));
    }

    const stats = await query;

    return stats.map(this.updateStartTime);
  }

  static async getByBookMD5(book_md5: string): Promise<PageStat[]> {
    const bookStats = await db<PageStat>('page_stat').where({ book_md5 });
    return bookStats.map(this.updateStartTime);
  }

  static async insert(data: PageStat): Promise<number[]> {
    return db<PageStat>('page_stat').insert(data);
  }

  static async update(
    book_md5: string,
    device_id: string,
    page: number,
    start_time: number,
    data: Partial<PageStat>
  ): Promise<number> {
    return db<PageStat>('page_stat').where({ book_md5, device_id, page, start_time }).update(data);
  }
}