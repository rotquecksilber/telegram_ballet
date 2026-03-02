import { useState, useEffect } from 'react'
import { apiRequest, endpoints } from '../../lib/api'
import toast from 'react-hot-toast'

export const BookingsManager = ({ groupedSchedule, viewMode = 'full' }: { groupedSchedule: any, viewMode?: 'full' | 'teacher' }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [bookings, setBookings] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const loadBookings = async (date: string) => {
        setLoading(true)
        try {
            const res = await apiRequest(`${endpoints.bookings}/date/${date}`)
            if (res.ok) {
                const data = await res.json()
                setBookings(data)
            }
        } finally { setLoading(false) }
    }

    useEffect(() => { loadBookings(selectedDate) }, [selectedDate])

    const handleAttendance = async (bookingId: number, status: boolean | null) => {
        const res = await apiRequest(`${endpoints.bookings}/${bookingId}/attendance`, {
            method: 'PATCH',
            body: JSON.stringify({ is_attended: status })
        })
        if (res.ok) {
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, is_attended: status } : b))
        }
    }

    const handleDebit = async (bookingId: number) => {
        try {
            const res = await apiRequest(`${endpoints.bookings}/${bookingId}/debit`, { method: 'POST' })
            if (res.ok) {
                toast.success('Занятие списано!')
                await loadBookings(selectedDate)
            }
        } catch (e) { toast.error('Ошибка сети') }
    }

    const hasAnySub = (b: any) => {
        if (b.subscription_id) return true;
        const subs = b.user?.subscriptions || b.user?.subscription || [];
        return subs.length > 0;
    }

    const lessonsForDate = groupedSchedule[selectedDate] || []

    return (
        <div className="bookings-manager">
            <input
                type="date"
                className="admin-input"
                style={{ marginBottom: '15px' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
            />

            {loading ? <p>Загрузка...</p> : lessonsForDate.map((lesson: any) => {
                const allLessonBookings = bookings.filter(b => b.schedule_id === lesson.id)

                const activeMap = new Map();
                allLessonBookings.filter(b => b.status !== 'cancelled').forEach(b => {
                    activeMap.set(b.user_id, b);
                });
                const activeBookings = Array.from(activeMap.values());

                return (
                    <div key={lesson.id} className="lesson-booking-group">
                        <div className="lesson-mini-header">
                            <span><strong>{lesson.time.slice(0,5)}</strong> — {lesson.classes?.name}</span>
                            <span className="count-badge">{activeBookings.length}</span>
                        </div>

                        <div className="bookings-list-admin">
                            {activeBookings.map((b: any) => {
                                const canDebit = hasAnySub(b);

                                // Определяем цвет имени на основе отметки учителя (is_attended)
                                let nameStyle = {};
                                if (b.is_attended === true) {
                                    nameStyle = { color: '#34c759', fontWeight: 'bold' }; // Зеленый
                                } else if (b.is_attended === false) {
                                    nameStyle = { color: '#ff3b30', fontWeight: 'bold' }; // Красный
                                }

                                return (
                                    <div key={b.id} className="booking-admin-row">
                                        <div className="user-info">
                                            {/* Имя меняет цвет в зависимости от is_attended */}
                                            <span className="user-name" style={nameStyle}>
                    {b.user?.first_name} {b.user?.last_name}
                                                {b.is_attended === true && ' (Был)'}
                                                {b.is_attended === false && ' (НЕТ)'}
                </span>
                                            <span className="user-phone">{b.user?.phone}</span>
                                        </div>

                                        <div className="action-zone">
                                            {/* УЧИТЕЛЬ: видит кнопки Был/Нет */}
                                            {viewMode === 'teacher' && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className={`mini-att-btn ${b.is_attended === true ? 'is-green' : ''}`}
                                                        onClick={() => handleAttendance(b.id, b.is_attended === true ? null : true)}
                                                    >
                                                        {b.is_attended === true ? '✅' : '👤'}
                                                    </button>
                                                    <button
                                                        className={`mini-att-btn ${b.is_attended === false ? 'is-red' : ''}`}
                                                        onClick={() => handleAttendance(b.id, b.is_attended === false ? null : false)}
                                                    >
                                                        {b.is_attended === false ? '❌' : '🚫'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* АДМИН: видит только кнопку списания */}
                                            {viewMode === 'full' && (
                                                <div className="debit-zone">
                                                    {b.is_debited || b.status === 'attended' ? (
                                                        <span className="status-ok">✅ Списано</span>
                                                    ) : (
                                                        <button
                                                            className={`debit-btn ${!canDebit ? 'no-sub' : ''}`}
                                                            onClick={() => handleDebit(b.id)}
                                                        >
                                                            {canDebit ? '🎟️ Списать' : '💸 Оплата'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
