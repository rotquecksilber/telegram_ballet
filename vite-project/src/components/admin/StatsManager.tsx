import { useEffect, useMemo, useState } from 'react'
import { apiRequest, endpoints } from '../../lib/api'
import '../../styles/AdminDashboard.css'

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

const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`)

export const StatsManager = () => {
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
                    apiRequest(endpoints.statsTimeseries('month')),
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
    }, [])

    const maxAttended = useMemo(
        () => Math.max(1, ...buckets.map(b => b.attended)),
        [buckets]
    )
    const maxClassAttended = useMemo(
        () => Math.max(1, ...classStats.map(c => c.attended)),
        [classStats]
    )
    const orderedBuckets = useMemo(() => [...buckets].reverse(), [buckets])

    return (
        <div className="stats-manager">
            <div className="stats-grid">
                <div className="stat-card accent">
                    <div className="stat-icon">🎟️</div>
                    <div className="stat-value">{snapshot?.activeSubscriptions ?? '—'}</div>
                    <div className="stat-label">Активных абонементов</div>
                </div>
                <div className={`stat-card ${snapshot && snapshot.expiringSoon > 0 ? 'highlight' : ''}`}>
                    <div className="stat-icon">⏳</div>
                    <div className="stat-value">{snapshot?.expiringSoon ?? '—'}</div>
                    <div className="stat-label">Истекают за 7 дней</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">❄️</div>
                    <div className="stat-value">{snapshot?.frozenSubscriptions ?? '—'}</div>
                    <div className="stat-label">Заморожено</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-value">{snapshot?.exhaustedSubscriptions ?? '—'}</div>
                    <div className="stat-label">Исчерпано, пора продлить</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-value">{snapshot?.totalStudents ?? '—'}</div>
                    <div className="stat-label">Учеников в базе</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🚫</div>
                    <div className="stat-value">{snapshot?.expiredSubscriptions ?? '—'}</div>
                    <div className="stat-label">Истёкшие абонементы</div>
                </div>
            </div>

            <div className="stats-section-title">📈 Динамика по месяцам</div>

            {totals && (
                <div className="stats-totals-row">
                    <div className="item"><b>{totals.attended}</b>пришли</div>
                    <div className="item"><b>{totals.noShow}</b>не пришли</div>
                    <div className="item"><b>{totals.cancelled + totals.lateCancelled}</b>отмены</div>
                    <div className="item"><b>{totals.newSubscriptions}</b>абонементов</div>
                    <div className="item"><b>{totals.newUsers}</b>новых</div>
                </div>
            )}

            {loading ? (
                <p className="stats-empty-hint">Загрузка...</p>
            ) : orderedBuckets.length === 0 ? (
                <p className="stats-empty-hint">Нет данных за период</p>
            ) : (
                <div className="stats-month-list">
                    {orderedBuckets.map(b => (
                        <div key={b.key} className="stats-month-card">
                            <div className="stats-month-header">
                                <span className="stats-month-name">{b.label}</span>
                                <span className="stats-month-attended">{b.attended} <small>пришли</small></span>
                            </div>
                            <div className="stats-bucket-bar-wrap">
                                <div
                                    className="stats-bucket-bar-fill"
                                    style={{ width: `${(b.attended / maxAttended) * 100}%` }}
                                />
                            </div>
                            <div className="stats-month-chips">
                                {b.noShow > 0 && <span className="stats-chip stats-chip--warn">{b.noShow} не пришли</span>}
                                {(b.cancelled + b.lateCancelled) > 0 && <span className="stats-chip stats-chip--muted">{b.cancelled + b.lateCancelled} отмен</span>}
                                {b.newSubscriptions > 0 && <span className="stats-chip stats-chip--good">+{b.newSubscriptions} абон.</span>}
                                {b.newUsers > 0 && <span className="stats-chip stats-chip--info">+{b.newUsers} новых</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="stats-section-title">🔥 Популярные направления</div>
            {classStats.length === 0 ? (
                <p className="stats-empty-hint">Нет посещений за последний месяц</p>
            ) : (
                <div className="stats-class-list">
                    {classStats.slice(0, 8).map((c, i) => (
                        <div key={c.name} className="stats-class-row">
                            <span className="stats-class-rank">{medal(i)}</span>
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
