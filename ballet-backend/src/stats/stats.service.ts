import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type GroupBy = 'day' | 'week' | 'month';

@Injectable()
export class StatsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getClient();
  }

  // ================= ТЕКУЩИЙ СНИМОК (на сейчас) =================
  async getSnapshot() {
    const { data: subsData, error } = await this.client
        .from('subscriptions')
        .select('id, status, expiry_date, is_frozen');

    if (error) throw new Error(error.message);
    const subs = subsData || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const in7Str = in7Days.toISOString().split('T')[0];

    const active = subs.filter(s => s.status === 'active' && !s.is_frozen);
    const frozen = subs.filter(s => s.status === 'frozen' || s.is_frozen);
    const exhausted = subs.filter(s => s.status === 'exhausted');
    const expired = subs.filter(s => s.status === 'expired');
    const expiringSoon = subs.filter(s =>
        s.status === 'active' && !s.is_frozen && !!s.expiry_date &&
        s.expiry_date >= todayStr && s.expiry_date <= in7Str
    );

    let totalStudents = 0;
    try {
      const { count } = await this.client
          .from('users')
          .select('id', { count: 'exact', head: true });
      totalStudents = count || 0;
    } catch {
      totalStudents = 0;
    }

    return {
      activeSubscriptions: active.length,
      frozenSubscriptions: frozen.length,
      exhaustedSubscriptions: exhausted.length,
      expiredSubscriptions: expired.length,
      expiringSoon: expiringSoon.length,
      totalStudents,
    };
  }

  // ================= ДИНАМИКА ПО ПЕРИОДАМ =================
  private defaultRange(groupBy: GroupBy) {
    const to = new Date();
    const from = new Date();
    if (groupBy === 'day') from.setDate(to.getDate() - 29);
    else if (groupBy === 'week') from.setDate(to.getDate() - 7 * 11);
    else from.setMonth(to.getMonth() - 5);
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0],
    };
  }

  private mondayOf(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private bucketKey(dateStr: string, groupBy: GroupBy): { key: string; label: string } {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    if (groupBy === 'day') {
      return {
        key: dateStr,
        label: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      };
    }

    if (groupBy === 'week') {
      const monday = this.mondayOf(date);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const key = monday.toISOString().split('T')[0];
      const label = `${monday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}–${sunday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
      return { key, label };
    }

    // month
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const label = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    return { key, label };
  }

  async getTimeseries(groupByRaw?: string, fromRaw?: string, toRaw?: string) {
    const groupBy: GroupBy = groupByRaw === 'day' || groupByRaw === 'week' ? groupByRaw : 'month';
    const defaults = this.defaultRange(groupBy);
    const from = fromRaw || defaults.from;
    const to = toRaw || defaults.to;

    // 1. Бронирования — группируем по дате ЗАНЯТИЯ (не по дате создания брони)
    const { data: bookingsData, error: bErr } = await this.client
        .from('bookings')
        .select('status, is_attended, schedule!inner(date)')
        .gte('schedule.date', from)
        .lte('schedule.date', to);

    if (bErr) throw new Error(bErr.message);
    const bookings = bookingsData || [];

    // 2. Новые абонементы — группируем по дате покупки
    const { data: subsData, error: sErr } = await this.client
        .from('subscriptions')
        .select('purchase_date')
        .gte('purchase_date', from)
        .lte('purchase_date', to);

    if (sErr) throw new Error(sErr.message);
    const subs = subsData || [];

    // 3. Новые ученики — по дате регистрации (мягко, без падения, если колонки нет)
    let users: any[] = [];
    try {
      const { data, error } = await this.client
          .from('users')
          .select('created_at')
          .gte('created_at', from)
          .lte('created_at', `${to}T23:59:59`);
      if (!error) users = data || [];
    } catch {
      users = [];
    }

    type Bucket = {
      key: string; label: string;
      attended: number; noShow: number; cancelled: number; lateCancelled: number;
      confirmed: number; newSubscriptions: number; newUsers: number;
    };

    const buckets = new Map<string, Bucket>();

    const ensureBucket = (dateStr: string): Bucket => {
      const { key, label } = this.bucketKey(dateStr, groupBy);
      if (!buckets.has(key)) {
        buckets.set(key, {
          key, label,
          attended: 0, noShow: 0, cancelled: 0, lateCancelled: 0,
          confirmed: 0, newSubscriptions: 0, newUsers: 0,
        });
      }
      return buckets.get(key);
    };

    for (const b of bookings) {
      const scheduleDate = (b as any).schedule?.date;
      if (!scheduleDate) continue;
      const bucket = ensureBucket(scheduleDate);

      if (b.status === 'attended' || b.is_attended === true) bucket.attended++;
      else if (b.is_attended === false) bucket.noShow++;

      if (b.status === 'cancelled') bucket.cancelled++;
      if (b.status === 'late_cancelled') bucket.lateCancelled++;
      if (b.status === 'confirmed') bucket.confirmed++;
    }

    for (const s of subs) {
      if (!s.purchase_date) continue;
      ensureBucket(s.purchase_date).newSubscriptions++;
    }

    for (const u of users) {
      if (!u.created_at) continue;
      const dateOnly = String(u.created_at).split('T')[0];
      ensureBucket(dateOnly).newUsers++;
    }

    const result = Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));

    const totals = result.reduce((acc, b) => ({
      attended: acc.attended + b.attended,
      noShow: acc.noShow + b.noShow,
      cancelled: acc.cancelled + b.cancelled,
      lateCancelled: acc.lateCancelled + b.lateCancelled,
      newSubscriptions: acc.newSubscriptions + b.newSubscriptions,
      newUsers: acc.newUsers + b.newUsers,
    }), { attended: 0, noShow: 0, cancelled: 0, lateCancelled: 0, newSubscriptions: 0, newUsers: 0 });

    return { groupBy, from, to, buckets: result, totals };
  }

  // ================= ПОПУЛЯРНОСТЬ НАПРАВЛЕНИЙ =================
  async getClassPopularity(fromRaw?: string, toRaw?: string) {
    const to = toRaw || new Date().toISOString().split('T')[0];
    const defaultFrom = new Date();
    defaultFrom.setMonth(defaultFrom.getMonth() - 1);
    const from = fromRaw || defaultFrom.toISOString().split('T')[0];

    const { data, error } = await this.client
        .from('bookings')
        .select('status, schedule!inner(date, classes:class_id(name))')
        .gte('schedule.date', from)
        .lte('schedule.date', to);

    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const b of data || []) {
      if (b.status !== 'attended') continue;
      const name = (b as any).schedule?.classes?.name || 'Без направления';
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    return Array.from(counts.entries())
        .map(([name, attended]) => ({ name, attended }))
        .sort((a, b) => b.attended - a.attended);
  }
}
