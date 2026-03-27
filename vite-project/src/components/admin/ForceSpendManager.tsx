import { useState, useEffect, useMemo } from "react"
import { apiRequest, endpoints } from "../../lib/api"
import toast from "react-hot-toast"

interface Props {
    users: any[]
}

export const ForceSpendManager = ({ users }: Props) => {
    // Состояния для поиска
    const [searchTerm, setSearchTerm] = useState("")
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    // Существующие состояния
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [selectedSub, setSelectedSub] = useState("")
    const [count, setCount] = useState(1)
    const [loading, setLoading] = useState(false)

    // 🔍 Логика фильтрации пользователей
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return [];
        return users.filter(u =>
            `${u.first_name} ${u.last_name} ${u.phone}`
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
        ).slice(0, 10); // Ограничим список для удобства
    }, [users, searchTerm])

    // 🔥 Загрузка абонементов (теперь следит за объектом selectedUser)
    useEffect(() => {
        const loadSubs = async () => {
            if (!selectedUser) return setSubscriptions([])

            const res = await apiRequest(
                endpoints.userSubscription(selectedUser.telegram_id)
            )

            if (res.ok) {
                const data = await res.json()
                setSubscriptions(data)
            } else {
                toast.error("Ошибка загрузки абонементов")
            }
        }
        loadSubs()
    }, [selectedUser])

    const handleForceSpend = async () => {
        if (!selectedSub) return toast.error("Выберите абонемент")
        if (count <= 0) return toast.error("Некорректное количество")
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
                toast.success("Занятия списаны")
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
        <div className="tg-force-spend" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* 🔎 Поле поиска вместо обычного select */}
            <div className="search-container" style={{ position: 'relative' }}>
                {!selectedUser ? (
                    <>
                        <input
                            className="tg-input"
                            type="text"
                            placeholder="Введите фамилию или телефон..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsDropdownOpen(true);
                            }}
                        />
                        {isDropdownOpen && searchTerm && (
                            <div className="search-dropdown" style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                background: '#fff', border: '1px solid #ccc', zIndex: 10,
                                maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}>
                                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => {
                                            setSelectedUser(u);
                                            setIsDropdownOpen(false);
                                            setSearchTerm("");
                                        }}
                                        style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                    >
                                        {u.first_name} {u.last_name} <small style={{opacity: 0.6}}>{u.phone}</small>
                                    </div>
                                )) : <div style={{ padding: '10px', color: '#999' }}>Никто не найден</div>}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="selected-user-box" style={{
                        padding: '10px', background: '#e3f2fd', borderRadius: '8px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <span>👤 <b>{selectedUser.first_name} {selectedUser.last_name}</b></span>
                        <button
                            onClick={() => {
                                setSelectedUser(null);
                                setSubscriptions([]);
                                setSelectedSub("");
                            }}
                            style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer' }}
                        >Изменить</button>
                    </div>
                )}
            </div>

            {/* 🎟️ Выбор абонемента (появляется только если есть подписки) */}
            {selectedUser && subscriptions.length > 0 && (
                <select
                    className="tg-input tg-select"
                    value={selectedSub}
                    onChange={e => setSelectedSub(e.target.value)}
                >
                    <option value="">Выберите абонемент</option>
                    {subscriptions.map(sub => (
                        <option key={sub.id} value={sub.id}>
                            ID {sub.id} — осталось {sub.remaining_lessons} ({sub.status})
                        </option>
                    ))}
                </select>
            )}

            {selectedUser && subscriptions.length === 0 && !loading && (
                <p style={{ fontSize: '12px', color: 'orange' }}>У пользователя нет активных абонементов</p>
            )}

            {/* 🔢 Количество и Кнопка */}
            {selectedSub && (
                <>
                    <input
                        className="tg-input tg-number"
                        type="number"
                        min={1}
                        value={count}
                        onChange={e => setCount(Number(e.target.value))}
                        placeholder="Количество занятий"
                    />
                    <button
                        className="tg-danger-btn"
                        onClick={handleForceSpend}
                        disabled={loading}
                    >
                        {loading ? "Списание..." : "⚠️ Списать занятия"}
                    </button>
                </>
            )}
        </div>
    )
}
