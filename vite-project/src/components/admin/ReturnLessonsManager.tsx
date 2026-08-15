import { useState, useMemo, useEffect } from 'react'
import { apiRequest, endpoints } from '../../lib/api'
import toast from "react-hot-toast"

interface Props {
    users: any[]
}

const statusLabel: Record<string, string> = {
    active: 'активен',
    frozen: 'заморожен',
    exhausted: 'исчерпан',
    expired: 'истёк',
}

export const ReturnLessonsManager = ({ users }: Props) => {
    const [search, setSearch] = useState('')
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [selectedSub, setSelectedSub] = useState("")
    const [count, setCount] = useState(1)
    const [loading, setLoading] = useState(false)

    const filteredUsers = useMemo(() => {
        if (!search) return [];
        return users
            .filter(u => `${u.last_name} ${u.first_name} ${u.phone}`.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
            .slice(0, 10);
    }, [users, search])

    useEffect(() => {
        const loadSubs = async () => {
            if (!selectedUser) return setSubscriptions([])
            const res = await apiRequest(endpoints.userAllSubscriptions(selectedUser.telegram_id))
            if (res.ok) {
                const data = await res.json()
                setSubscriptions(data)
            }
        }
        loadSubs()
    }, [selectedUser])

    const handleAddLessons = async () => {
        if (!selectedSub) return toast.error("Выберите абонемент")
        setLoading(true)
        try {
            const res = await apiRequest(endpoints.addLessonsSubscription(selectedSub), {
                method: "POST",
                body: JSON.stringify({ count })
            })
            if (res.ok) {
                toast.success("Занятие(я) возвращено на абонемент")
                setSelectedUser(null); setSearch(""); setSelectedSub(""); setCount(1);
            } else {
                toast.error("Ошибка возврата занятий")
            }
        } catch {
            toast.error("Ошибка сети")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-card subscription-border" style={{ height: 'auto', minHeight: '120px' }}>
            {!selectedUser ? (
                <div className="user-selector" style={{ display: 'flex', flexDirection: 'column' }}>
                    <input
                        type="text"
                        placeholder="Введите фамилию ученика..."
                        className="admin-search-input"
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'var(--color-paper)',
                            color: 'var(--color-ink)',
                            border: '1px solid var(--color-hint)'
                        }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    {search && (
                        <div className="user-list-mini" style={{
                            height: 'auto',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            marginTop: '8px',
                            border: '1px solid var(--color-hint)',
                            borderRadius: '8px',
                            background: 'var(--color-paper-2)'
                        }}>
                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                <div
                                    key={u.id}
                                    className="user-row"
                                    style={{ padding: '12px', borderBottom: '1px solid var(--color-hint)', cursor: 'pointer' }}
                                    onClick={() => setSelectedUser(u)}
                                >
                                    <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                                        {u.last_name} {u.first_name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-hint)' }}>
                                        {u.phone}
                                    </div>
                                </div>
                            )) : (
                                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                                    Ничего не найдено
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="subscription-form-active animate-fade">
                    <div className="selected-user-badge" style={{ background: 'var(--color-paper-2)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Ученик: <b>{selectedUser.last_name}</b></span>
                        <button className="btn-text" onClick={() => setSelectedUser(null)}>Изменить</button>
                    </div>

                    <div className="field mt-12">
                        <label className="field-label-mini">Абонемент</label>
                        <select
                            className="admin-input tg-select"
                            value={selectedSub}
                            onChange={e => setSelectedSub(e.target.value)}
                            style={{ width: '100%', padding: '8px' }}
                        >
                            <option value="">Выберите...</option>
                            {subscriptions.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                    ID {sub.id} — {statusLabel[sub.status] || sub.status} (Остаток: {sub.remaining_lessons})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedSub && (
                        <>
                            <div className="field mt-12">
                                <label className="field-label-mini">Сколько занятий вернуть</label>
                                <input
                                    type="number"
                                    min={1}
                                    className="admin-input"
                                    value={count}
                                    onChange={e => setCount(Number(e.target.value))}
                                />
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-hint)', marginTop: '6px' }}>
                                Срок действия абонемента не изменится.
                            </div>
                            <button
                                className="confirm-btn mt-16"
                                style={{ width: '100%' }}
                                onClick={handleAddLessons}
                                disabled={loading}
                            >
                                {loading ? 'Возврат...' : 'Вернуть занятие(я)'}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
