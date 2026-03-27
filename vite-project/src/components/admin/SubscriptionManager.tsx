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

    // Поиск (точно такой же как в SubscriptionManager)
    const filteredUsers = useMemo(() => {
        return users
            .filter(u => `${u.last_name} ${u.first_name}`.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
    }, [users, search])

    // Загрузка абонементов при выборе пользователя
    useEffect(() => {
        const loadSubs = async () => {
            if (!selectedUser) return setSubscriptions([])

            const res = await apiRequest(endpoints.userSubscription(selectedUser.telegram_id))
            if (res.ok) {
                const data = await res.json()
                // Фильтруем только те, где есть занятия
                setSubscriptions(data.filter((s: any) => s.remaining_lessons > 0))
            } else {
                toast.error("Ошибка загрузки абонементов")
            }
        }
        loadSubs()
    }, [selectedUser])

    const handleForceSpend = async () => {
        if (!selectedSub) return toast.error("Выберите абонемент")
        if (count <= 0) return toast.error("Укажите количество")

        if (!window.confirm(`Списать ${count} занятий?`)) return

        setLoading(true)
        try {
            const res = await apiRequest(
                endpoints.forceSpendSubscription(selectedSub),
                {
                    method: "POST",
                    body: JSON.stringify({ count })
                }
            )

            if (res.ok) {
                toast.success("Занятия успешно списаны")
                setCount(1)
                // Обновляем список абонементов
                const updated = await apiRequest(endpoints.userSubscription(selectedUser.telegram_id))
                if (updated.ok) setSubscriptions(await updated.json())
            } else {
                const err = await res.json()
                toast.error(err.message || "Ошибка сервера")
            }
        } catch {
            toast.error("Ошибка сети")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-card subscription-border">
            {!selectedUser ? (
                /* СЕКЦИЯ ПОИСКА (КОПИЯ СТИЛЯ) */
                <div className="user-selector">
                    <input
                        type="text"
                        placeholder="Поиск ученика для списания..."
                        className="admin-search-input"
                        style={{
                            background: 'var(--tg-theme-bg-color)',
                            color: 'var(--tg-theme-text-color)',
                            border: '1px solid var(--tg-theme-hint-color)'
                        }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="user-list-mini" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredUsers.length > 0 ? filteredUsers.map(u => (
                            <div key={u.id} className="user-row" onClick={() => setSelectedUser(u)}>
                                <span>{u.last_name} {u.first_name}</span>
                                <span className="user-phone-hint">{u.phone}</span>
                            </div>
                        )) : <div className="p-12 text-center opacity-50">Никто не найден</div>}
                    </div>
                </div>
            ) : (
                /* ФОРМА СПИСАНИЯ */
                <div className="subscription-form-active animate-fade">
                    <div className="selected-user-badge" style={{ border: '1px solid var(--tg-theme-button-color)' }}>
                        <span>Ученик: <b>{selectedUser.last_name} {selectedUser.first_name}</b></span>
                        <button className="btn-text" onClick={() => {
                            setSelectedUser(null);
                            setSelectedSub("");
                        }}>Изменить</button>
                    </div>

                    <div className="field mt-12">
                        <label className="field-label-mini">Выберите абонемент</label>
                        {subscriptions.length > 0 ? (
                            <select
                                className="admin-input tg-select"
                                style={{
                                    background: 'var(--tg-theme-bg-color)',
                                    color: 'var(--tg-theme-text-color)'
                                }}
                                value={selectedSub}
                                onChange={e => setSelectedSub(e.target.value)}
                            >
                                <option value="">---</option>
                                {subscriptions.map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                        ID: {sub.id} | Остаток: {sub.remaining_lessons} зан.
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="p-12 text-center opacity-50" style={{ fontSize: '13px' }}>
                                Ученика нет активных абонементов
                            </div>
                        )}
                    </div>

                    {selectedSub && (
                        <div className="animate-fade">
                            <div className="field mt-12">
                                <label className="field-label-mini">Количество для списания</label>
                                <input
                                    type="number"
                                    className="admin-input"
                                    min="1"
                                    value={count}
                                    onChange={e => setCount(Number(e.target.value))}
                                />
                            </div>

                            <button
                                className="confirm-btn mt-16"
                                style={{ background: 'var(--tg-theme-destructive-text-color, #ff4d4f)' }}
                                onClick={handleForceSpend}
                                disabled={loading}
                            >
                                {loading ? 'Списание...' : '⚠️ Подтвердить списание'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
