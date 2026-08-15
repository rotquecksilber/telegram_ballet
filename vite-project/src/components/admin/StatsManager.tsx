import { useEffect, useMemo, useState } from 'react'
import { apiRequest, endpoints } from '../../lib/api'
import '../../styles/AdminDashboard.css'

type GroupBy = 'day' | 'week' | 'month'

interface Bucket {
    key: string
    label: string
    attended: number
    noShow: number
    cancelled: number
    lateCancelled: number
    confirmed: number
    newSubscriptions: number
    newUsers: number
}

interface Snapshot {
    activeSubscriptions: number
    frozenSubscriptions: number
    exhaustedSubscriptions: number
    expiredSubscriptions: number
    expiringSoon: number
    totalStudents: number
}

interface ClassStat {
    name: string
    attended: number
}

export const StatsManager = () => {
    const [groupBy, setGroupBy] = useState<GroupBy>('week')
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
    const [buckets, setBuckets] = useState<Bucket[]>([])
    const [totals, setTotals] = useState<Record<string, number> | null>(null)
    const [classStats, setClassStats] = useState<ClassStat[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setLoading(true)
            try {
                const [snapRes, seriesRes] = await Promise.all([
                    apiRequest(endpoints.statsSnapshot),
                    apiRequest(endpoints.statsTimeseries(groupBy)),
                ])

                if (!cancelled && snapRes.ok) {
                    setSnapshot(await snapRes.json())
                }

                let from: string | undefined
                let to: string | undefined

                if (!cancelled && seriesRes.ok) {
                    const data = await seriesRes.json()
                    setBuckets(data.buckets || [])
                    setTotals(data.totals || null)
                    from = data.from
                    to = data.to
                }

                const classesRes = await apiRequest(endpoints.statsClasses(from, to))
                if (!cancelled && classesRes.ok) {
                    setClassStats(await classesRes.json())
                }
            } catch {
                // молча — секция статистики не должна ронять остальную админку
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => { cancelled = true }
    }, [groupBy])

    const maxAttended = useMemo(
        () => Math.max(1, ...buckets.map(b => b.attended)),
        [buckets]
    )
    const maxClassAttended = useMemo(
        () => Math.max(1, ...classStats.map(c => c.attended)),
        [classStats]
    )

    return (
        <div className="stats-manager">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{snapshot?.activeSubscriptions ?? '—'}</div>
                    <div className="stat-label">Активных абонементов</div>
                </div>
                <div className={`stat-card ${snapshot && snapshot.expiringSoon > 0 ? 'highlight' : ''}`}>
                    <div className="stat-value">{snapshot?.expiringSoon ?? '—'}</div>
                    <div className="stat-label">Истекают в ближайшие 7 дней</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{snapshot?.frozenSubscriptions ?? '—'}</div>
                    <div className="stat-label">Заморожено</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{snapshot?.exhaustedSubscriptions ?? '—'}</div>
                    <div className="stat-label">Исчерпано (нужно продлить)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{snapshot?.totalStudents ?? '—'}</div>
                    <div className="stat-label">Всего учеников в базе</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{snapshot?.expiredSubscriptions ?? '—'}</div>
                    <div className="stat-label">Истёкшие абонементы</div>
                </div>
            </div>

            <div className="segmented-control">
                <button className={`segment-btn ${groupBy === 'day' ? 'active' : ''}`} onClick={() => setGroupBy('day')}>По дням</button>
                <button className={`segment-btn ${groupBy === 'week' ? 'active' : ''}`} onClick={() => setGroupBy('week')}>По неделям</button>
                <button className={`segment-btn ${groupBy === 'month' ? 'active' : ''}`} onClick={() => setGroupBy('month')}>По месяцам</button>
            </div>

            {totals && (
                <div className="stats-totals-row">
                    <div className="item"><b>{totals.attended}</b>пришли</div>
                    <div className="item"><b>{totals.noShow}</b>не пришли</div>
                    <div className="item"><b>{totals.cancelled + totals.lateCancelled}</b>отмены</div>
                    <div className="item"><b>{totals.newSubscriptions}</b>абонементов куплено</div>
                    <div className="item"><b>{totals.newUsers}</b>новых учеников</div>
                </div>
            )}

            {loading ? (
                <p style={{ textAlign: 'center', opacity: 0.6, padding: '12px 0' }}>Загрузка...</p>
            ) : buckets.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.6, padding: '12px 0' }}>Нет данных за период</p>
            ) : (
                <div>
                    {buckets.map(b => (
                        <div key={b.key} className="stats-bucket-row">
                            <span className="stats-bucket-label" title={b.label}>{b.label}</span>
                            <div className="stats-bucket-bar-wrap">
                                <div
                                    className="stats-bucket-bar-fill"
                                    style={{ width: `${(b.attended / maxAttended) * 100}%` }}
                                />
                            </div>
                            <div className="stats-bucket-numbers">
                                <b>{b.attended}</b> пришли
                                {b.noShow > 0 && <> · {b.noShow} не пришли</>}
                                {(b.cancelled + b.lateCancelled) > 0 && <> · {b.cancelled + b.lateCancelled} отмен</>}
                                {b.newSubscriptions > 0 && <> · +{b.newSubscriptions} абон.</>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="stats-section-title">🔥 Популярные направления за период</div>
            {classStats.length === 0 ? (
                <p style={{ textAlign: 'center', opacity: 0.6, padding: '8px 0' }}>Нет посещений за период</p>
            ) : (
                <div>
                    {classStats.slice(0, 8).map(c => (
                        <div key={c.name} className="stats-class-row">
                            <span className="stats-class-name" title={c.name}>{c.name}</span>
                            <div className="stats-class-bar-wrap">
                                <div
                                    className="stats-class-bar-fill"
                                    style={{ width: `${(c.attended / maxClassAttended) * 100}%` }}
                                />
                            </div>
                            <span className="stats-class-count">{c.attended}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
