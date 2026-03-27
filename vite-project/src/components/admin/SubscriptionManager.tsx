import { useState, useMemo, useEffect } from 'react'
import { apiRequest, endpoints } from '../../lib/api'
import toast from "react-hot-toast"
import '../../styles/AdminDashboard.css'

interface Props {
    users: any[]
}

export const SubscriptionManager = ({ users }: Props) => {
    const [search, setSearch] = useState('')
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    // Поля формы
    const [lessons, setLessons] = useState<number>(8)
    const [customLessons, setCustomLessons] = useState('')
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
    const [expiryDate, setExpiryDate] = useState('')

    // НОВОЕ: Срок в днях для передачи на бэк
    const [durationDays, setDurationDays] = useState(30)

    // Срок (для подсветки активного таба)
    const [activeMonthTab, setActiveMonthTab] = useState(1)

    // Заморозка
    const [allowFreeze, setAllowFreeze] = useState(false)
    const [freezeDays, setFreezeDays] = useState(7)

    // Инициализация при первом рендере или смене даты покупки
    useEffect(() => {
        updateExpiryDate(activeMonthTab)
    }, [purchaseDate])

    const updateExpiryDate = (months: number) => {
        setActiveMonthTab(months)
        const dateStart = new Date(purchaseDate)
        const dateEnd = new Date(purchaseDate)

        dateEnd.setMonth(dateEnd.getMonth() + months)

        // Вычисляем разницу в днях для duration_days
        const diffTime = Math.abs(dateEnd.getTime() - dateStart.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        setDurationDays(diffDays)
        setExpiryDate(dateEnd.toISOString().split('T')[0])
    }

    const handleCustomExpiryChange = (val: string) => {
        setExpiryDate(val)
        setActiveMonthTab(0)

        // Если админ вручную выбрал дату, пересчитываем durationDays
        const dateStart = new Date(purchaseDate)
        const dateEnd = new Date(val)
        if (dateEnd > dateStart) {
            const diffTime = Math.abs(dateEnd.getTime() - dateStart.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            setDurationDays(diffDays)
        }
    }

    const filteredUsers = useMemo(() => {
        return users
            .filter(u => `${u.last_name} ${u.first_name}`.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
    }, [users, search])

    const handleCreate = async () => {
        if (!selectedUser) return toast.error('Выберите ученика')
        const finalLessons = customLessons ? parseInt(customLessons) : lessons
        if (!finalLessons) return toast.error('Укажите количество занятий')

        setLoading(true)
        try {
            const res = await apiRequest(endpoints.subscriptions, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: selectedUser.telegram_id,
                    total_lessons: finalLessons,
                    remaining_lessons: finalLessons,
                    purchase_date: purchaseDate,
                    // Передаем duration_days для активации при первом посещении
                    duration_days: durationDays,
                    // Передаем expiry_date как предварительный (он пересчитается при списании)
                    expiry_date: expiryDate,
                    freeze_limit_days: allowFreeze ? freezeDays : 0,
                    status: 'active'
                })
            })

            if (res.ok) {
                toast.success(`Абонемент создан для ${selectedUser.last_name}`)
                setSelectedUser(null)
                setCustomLessons('')
                setAllowFreeze(false)
                updateExpiryDate(1)
            } else {
                toast.error('Ошибка при сохранении в базу')
            }
        } catch (e) {
            toast.error('Ошибка сети')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-card subscription-border">
            {!selectedUser ? (
                <div className="user-selector">
                    <input
                        type="text"
                        placeholder="Поиск ученика по фамилии..."
                        className="admin-search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="user-list-mini">
                        {filteredUsers.length > 0 ? filteredUsers.map(u => (
                            <div key={u.id} className="user-row" onClick={() => setSelectedUser(u)}>
                                <span>{u.last_name} {u.first_name}</span>
                                <span className="user-phone-hint">{u.phone}</span>
                            </div>
                        )) : <div className="p-12 text-center opacity-50">Никто не найден</div>}
                    </div>
                </div>
            ) : (
                <div className="subscription-form-active">
                    <div className="selected-user-badge">
                        <span>Ученик: <b>{selectedUser.last_name} {selectedUser.first_name}</b></span>
                        <button className="btn-text" onClick={() => setSelectedUser(null)}>Изменить</button>
                    </div>

                    <div className="field">
                        <label className="field-label-mini">Количество занятий</label>
                        <div className="lessons-grid-smart">
                            {[4, 8, 12, 24].map(n => (
                                <button
                                    key={n}
                                    className={`opt-btn ${lessons === n && !customLessons ? 'active' : ''}`}
                                    onClick={() => { setLessons(n); setCustomLessons(''); }}
                                >{n}</button>
                            ))}
                            <input
                                type="number"
                                placeholder="+"
                                value={customLessons}
                                onChange={(e) => setCustomLessons(e.target.value)}
                                className="opt-input"
                            />
                        </div>
                    </div>

                    <div className="form-row-grid-1">
                        <div className="field">
                            <label className="field-label-mini">Дата покупки</label>
                            <input
                                type="date"
                                className="admin-input"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                            />
                        </div>

                        <div className="field mt-12">
                            <label className="field-label-mini">Срок (активируется при первом визите)</label>
                            <div className="segmented-control mb-8">
                                {[1, 2, 3].map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        className={`segment-btn ${activeMonthTab === m ? 'active' : ''}`}
                                        onClick={() => updateExpiryDate(m)}
                                    >{m} мес</button>
                                ))}
                            </div>
                            <div className="expiry-hint" style={{fontSize: '12px', marginBottom: '4px', opacity: 0.7}}>
                                Примерный срок: {durationDays} дн.
                            </div>
                            <input
                                type="date"
                                className="admin-input"
                                value={expiryDate}
                                onChange={(e) => handleCustomExpiryChange(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="freeze-section">
                        <div className="toggle-container">
                            <span className="toggle-label">Разрешить заморозку</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={allowFreeze}
                                    onChange={e => setAllowFreeze(e.target.checked)}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>

                        {allowFreeze && (
                            <div className="freeze-details animate-fade">
                                <label className="field-label-mini">Лимит дней заморозки</label>
                                <div className="segmented-control">
                                    {[7, 14, 30].map(d => (
                                        <button
                                            key={d}
                                            className={`segment-btn ${freezeDays === d ? 'active' : ''}`}
                                            onClick={() => setFreezeDays(d)}
                                        >{d} дн</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="confirm-btn mt-16" onClick={handleCreate} disabled={loading}>
                        {loading ? 'Создание...' : 'Выдать абонемент'}
                    </button>
                </div>
            )}
        </div>
    )
}
