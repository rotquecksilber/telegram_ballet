import { useState, useEffect } from "react"
import { apiRequest, endpoints } from "../../lib/api"
import toast from "react-hot-toast"

interface Props {
    users: any[]
}

export const ForceSpendManager = ({ users }: Props) => {
    const [selectedUser, setSelectedUser] = useState("")
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [selectedSub, setSelectedSub] = useState("")
    const [count, setCount] = useState(1)
    const [loading, setLoading] = useState(false)

    // 🔥 загрузка абонементов пользователя
    useEffect(() => {
        const loadSubs = async () => {
            if (!selectedUser) return setSubscriptions([])

            const res = await apiRequest(
                endpoints.userSubscription(selectedUser)
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

    // 🚀 принудительное списание
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

                // 🔥 обновляем список абонементов
                const updated = await apiRequest(
                    endpoints.userSubscription(selectedUser)
                )

                if (updated.ok) {
                    setSubscriptions(await updated.json())
                }

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
        <div className="tg-force-spend">

            {/* 👤 пользователь */}
            <select
                className="tg-input tg-select"
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
            >
                <option value="">Выберите ученика</option>

                {users.map(u => (
                    <option key={u.id} value={u.telegram_id}>
                        {u.first_name} {u.last_name} ({u.phone})
                    </option>
                ))}
            </select>

            {/* 🎟️ абонемент */}
            {subscriptions.length > 0 && (
                <select
                    className="tg-input tg-select"
                    value={selectedSub}
                    onChange={e => setSelectedSub(e.target.value)}
                >
                    <option value="">Выберите абонемент</option>

                    {subscriptions.map(sub => (
                        <option key={sub.id} value={sub.id}>
                            ID {sub.id} — осталось {sub.remaining_lessons}
                        </option>
                    ))}
                </select>
            )}

            {/* 🔢 количество */}
            {selectedSub && (
                <input
                    className="tg-input tg-number"
                    type="number"
                    min={1}
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    placeholder="Количество занятий"
                />
            )}

            {/* 🔥 кнопка */}
            <button
                className="tg-danger-btn"
                onClick={handleForceSpend}
                disabled={loading || !selectedSub}
            >
                {loading ? "Списание..." : "⚠️ Списать занятия"}
            </button>

        </div>
    )
}
