import { useState, useEffect } from 'react'
import { apiRequest, endpoints } from '../../lib/api'
import toast from "react-hot-toast"

interface CustomerDetailsProps {
    userId: string | number
}

export const CustomerDetails = ({ userId }: CustomerDetailsProps) => {
    const [data, setData] = useState<{ subs: any[], history: any[] } | null>(null)
    const [loading, setLoading] = useState(false)
    const [editingSubId, setEditingSubId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<{ expiry_date: string; remaining_lessons: number; total_lessons: number; status: string }>({
        expiry_date: '', remaining_lessons: 0, total_lessons: 0, status: 'active'
    })
    const [saving, setSaving] = useState(false)

    const startEdit = (sub: any) => {
        setEditingSubId(sub.id)
        setEditForm({
            expiry_date: sub.expiry_date ? String(sub.expiry_date).slice(0, 10) : '',
            remaining_lessons: sub.remaining_lessons ?? 0,
            total_lessons: sub.total_lessons ?? 0,
            status: sub.status || 'active'
        })
    }

    const cancelEdit = () => setEditingSubId(null)

    const saveEdit = async () => {
        if (editingSubId == null) return
        setSaving(true)
        try {
            const res = await apiRequest(endpoints.updateSubscription(editingSubId), {
                method: 'PATCH',
                body: JSON.stringify({
                    expiry_date: editForm.expiry_date || null,
                    remaining_lessons: Number(editForm.remaining_lessons),
                    total_lessons: Number(editForm.total_lessons),
                    status: editForm.status
                })
            })

            if (res.ok) {
                const updated = await res.json()
                setData(prev => prev ? {
                    ...prev,
                    subs: prev.subs.map(s => s.id === updated.id ? updated : s)
                } : prev)
                toast.success('Абонемент обновлён')
                setEditingSubId(null)
            } else {
                toast.error('Ошибка при сохранении')
            }
        } catch {
            toast.error('Ошибка сети')
        } finally {
            setSaving(false)
        }
    }

    useEffect(() => {
        const fetchInfo = async () => {
            if (!userId) return;

            setLoading(true);
            console.log('--- Загрузка профиля клиента ---');
            console.log('ID для запроса:', userId);

            try {
                // Используем строковый ID для надежности BigInt
                const cleanId = String(userId).trim();

                const [sRes, bRes] = await Promise.all([
                    apiRequest(endpoints.userSubscription(cleanId)),
                    apiRequest(endpoints.userBookings(cleanId))
                ]);

                if (sRes.ok && bRes.ok) {
                    const subs = await sRes.json();
                    const history = await bRes.json();

                    // Сортируем историю: сначала новые (по дате занятия или создания)
                    const sortedHistory = history.sort((a: any, b: any) => {
                        return new Date(b.schedule?.date || b.created_at).getTime() -
                            new Date(a.schedule?.date || a.created_at).getTime();
                    });

                    setData({ subs, history: sortedHistory });
                    console.log('Данные успешно загружены');
                } else {
                    console.error('Ошибка API:', sRes.status, bRes.status);
                }
            } catch (err) {
                console.error('Ошибка соединения:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchInfo();
    }, [userId])

    // Состояние: ничего не выбрано
    if (!userId) {
        return (
            <div className="tg-hint animate-fade-in">
                Выберите пользователя из списка выше, чтобы увидеть его абонементы и историю посещений.
            </div>
        )
    }

    // Состояние: загрузка (твой скелетон)
    if (loading) {
        return (
            <div className="admin-loader-container">
                <div className="subscription-skeleton"></div>
                <div className="subscription-skeleton" style={{ height: '100px', marginTop: '12px' }}></div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            {/* СЕКЦИЯ АБОНЕМЕНТОВ */}
            <div className="lesson-booking-group">
                <div className="lesson-mini-header">
                    <span className="status-label">Абонементы клиента</span>
                </div>

                {data?.subs && data.subs.length > 0 ? (
                    data.subs.map(sub => (
                        editingSubId === sub.id ? (
                            <div key={sub.id} className="booking-admin-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                                <div className="selected-user-badge">
                                    <span>Абонемент <b>#{sub.id}</b></span>
                                    <button className="btn-text" onClick={cancelEdit}>Отмена</button>
                                </div>

                                <div className="field">
                                    <label className="field-label-mini">Статус</label>
                                    <select
                                        className="admin-input"
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="active">Активен</option>
                                        <option value="frozen">Заморожен</option>
                                        <option value="expired">Истёк</option>
                                        <option value="exhausted">Исчерпан</option>
                                    </select>
                                </div>

                                <div className="form-row-grid-1">
                                    <div className="field">
                                        <label className="field-label-mini">Осталось занятий</label>
                                        <input
                                            type="number"
                                            className="admin-input"
                                            value={editForm.remaining_lessons}
                                            onChange={e => setEditForm({ ...editForm, remaining_lessons: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="field mt-12">
                                        <label className="field-label-mini">Всего занятий</label>
                                        <input
                                            type="number"
                                            className="admin-input"
                                            value={editForm.total_lessons}
                                            onChange={e => setEditForm({ ...editForm, total_lessons: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="field">
                                    <label className="field-label-mini">Дата окончания</label>
                                    <input
                                        type="date"
                                        className="admin-input"
                                        value={editForm.expiry_date}
                                        onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value })}
                                    />
                                </div>

                                <button className="confirm-btn mt-16" onClick={saveEdit} disabled={saving}>
                                    {saving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        ) : (
                            <div key={sub.id} className="booking-admin-row" style={{ cursor: 'pointer' }} onClick={() => startEdit(sub)}>
                                <div className="user-info">
                                    <span className="user-name">
                                        {sub.is_frozen ? '❄️ Заморожен' : sub.status === 'active' ? '🔹 Активен' : '⌛ Завершен'}
                                    </span>
                                    <span className="user-phone">
                                        Остаток: <b>{sub.remaining_lessons}</b> из {sub.total_lessons || 8} зан.
                                    </span>
                                </div>
                                <div className="user-info" style={{ alignItems: 'flex-end' }}>
                                    <span className={sub.status === 'active' ? 'status-ok' : 'user-phone'}>
                                        ID: {sub.id} ✏️
                                    </span>
                                    <span className="user-phone">до {new Date(sub.expiry_date).toLocaleDateString('ru-RU')}</span>
                                </div>
                            </div>
                        )
                    ))
                ) : (
                    <div className="booking-admin-row">
                        <span className="user-phone" style={{ fontStyle: 'italic' }}>Абонементы не найдены</span>
                    </div>
                )}
            </div>

            {/* СЕКЦИЯ ИСТОРИИ */}
            <div className="lesson-booking-group" style={{ marginTop: '20px' }}>
                <div className="lesson-mini-header">
                    <span className="status-label">История занятий и списаний</span>
                </div>

                {data?.history && data.history.length > 0 ? (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {data.history.map(book => (
                            <div
                                key={book.id}
                                className={`booking-admin-row ${book.status === 'cancelled' ? 'cancelled' : ''}`}
                            >
                                <div className="user-info">
                                    <span className="user-name">{book.schedule?.classes?.name || 'Занятие'}</span>
                                    <span className="user-phone">
                                        {book.schedule?.date ? new Date(book.schedule.date).toLocaleDateString('ru-RU') : 'Дата не указана'}
                                        {book.schedule?.time && ` • ${book.schedule.time.slice(0, 5)}`}
                                    </span>
                                </div>
                                <div className="user-info" style={{ alignItems: 'flex-end' }}>
                                    {book.status === 'attended' ? (
                                        <span className="status-ok">ПОСЕЩЕНО</span>
                                    ) : book.status === 'cancelled' ? (
                                        <span className="user-phone">ОТМЕНЕНО</span>
                                    ) : (
                                        <span style={{ color: '#ff9500', fontSize: '12px', fontWeight: 'bold' }}>ЗАПИСАН</span>
                                    )}

                                    {book.subscription_id ? (
                                        <span className="status-label">Билет #{book.subscription_id}</span>
                                    ) : (
                                        book.status !== 'cancelled' && <span className="status-label" style={{color: '#ff3b30'}}>ОПЛАТА НА МЕСТЕ</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="booking-admin-row">
                        <span className="user-phone">История посещений пуста</span>
                    </div>
                )}
            </div>
        </div>
    )
}
