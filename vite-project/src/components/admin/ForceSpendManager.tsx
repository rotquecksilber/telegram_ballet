import { useState, useMemo, useEffect } from 'react'
import { apiRequest, endpoints } from '../../lib/api'
import toast from "react-hot-toast"

interface Props {
    users: any[]
}

export const ForceSpendManager = ({ users }: Props) => {
    const [search, setSearch] = useState('')
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [selectedSub, setSelectedSub] = useState("")
    const [count, setCount] = useState(1)
    const [loading, setLoading] = useState(false)

    const filteredUsers = useMemo(() => {
        if (!search) return []; // Если поиск пустой, не показываем огромный список
        return users
            .filter(u => `${u.last_name} ${u.first_name} ${u.phone}`.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
            .slice(0, 10); // Ограничим 10 результатами, чтобы не ломать верстку
    }, [users, search])

    useEffect(() => {
        const loadSubs = async () => {
            if (!selectedUser) return setSubscriptions([])
            const res = await apiRequest(endpoints.userSubscription(selectedUser.telegram_id))
            if (res.ok) {
                const data = await res.json()
                setSubscriptions(data.filter((s: any) => s.remaining_lessons > 0))
            }
        }
        loadSubs()
    }, [selectedUser])

    const handleForceSpend = async () => {
        if (!selectedSub) return toast.error("Выберите абонемент")
        setLoading(true)
        try {
            const res = await apiRequest(endpoints.forceSpendSubscription(selectedSub), {
                method: "POST",
                body: JSON.stringify({ count })
            })
            if (res.ok) {
                toast.success("Списано")
                setSelectedUser(null); setSearch(""); setSelectedSub("");
            } else {
                toast.error("Ошибка списания")
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
                            background: 'var(--tg-theme-bg-color)',
                            color: 'var(--tg-theme-text-color)',
                            border: '1px solid var(--tg-theme-hint-color)'
                        }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    {/* Список, который РАСТЯГИВАЕТСЯ */}
                    {search && (
                        <div className="user-list-mini" style={{
                            height: 'auto',
                            maxHeight: '300px', // Ограничиваем, но даем расти
                            overflowY: 'auto',
                            marginTop: '8px',
                            border: '1px solid var(--tg-theme-hint-color)',
                            borderRadius: '8px',
                            background: 'var(--tg-theme-secondary-bg-color)'
                        }}>
                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                <div
                                    key={u.id}
                                    className="user-row"
                                    style={{ padding: '12px', borderBottom: '1px solid var(--tg-theme-hint-color)', cursor: 'pointer' }}
                                    onClick={() => setSelectedUser(u)}
                                >
                                    <div style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
                                        {u.last_name} {u.first_name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--tg-theme-hint-color)' }}>
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
                    <div className="selected-user-badge" style={{ background: 'var(--tg-theme-secondary-bg-color)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
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
                                    ID {sub.id} (Остаток: {sub.remaining_lessons})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedSub && (
                        <>
                            <div className="field mt-12">
                                <label className="field-label-mini">Количество списания</label>
                                <input
                                    type="number"
                                    className="admin-input"
                                    value={count}
                                    onChange={e => setCount(Number(e.target.value))}
                                />
                            </div>
                            <button
                                className="confirm-btn mt-16"
                                style={{ background: 'var(--tg-theme-destructive-text-color, #ff4d4f)', width: '100%' }}
                                onClick={handleForceSpend}
                                disabled={loading}
                            >
                                {loading ? 'Списание...' : 'Подтвердить списание'}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
