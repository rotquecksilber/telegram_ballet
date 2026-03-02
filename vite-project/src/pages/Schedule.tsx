import '../styles/Schedule.css'
import { useEffect, useState } from 'react'
import { apiRequest, endpoints } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../store/userStore'
import toast from 'react-hot-toast'

export const Schedule = () => {
    const { user } = useUserStore()
    const [groupedData, setGroupedData] = useState<Record<string, any[]>>({})
    const [loading, setLoading] = useState(true)
    const [bookingLoading, setBookingLoading] = useState<number | null>(null)
    const [userSubs, setUserSubs] = useState<any[]>([])
    const [bookedScheduleIds, setBookedScheduleIds] = useState<number[]>([])

    // 1. ФУНКЦИЯ ПРОВЕРКИ ВРЕМЕНИ
    const isRegistrationClosed = (date: string, time: string) => {
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);

        const lessonDate = new Date(year, month - 1, day, hours, minutes);
        const now = new Date();

        const diffMs = lessonDate.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        // Закрываем, если до занятия 15 минут или оно уже началось/прошло
        return diffMins <= 15;
    };

    useEffect(() => {
        const loadScheduleData = async () => {
            try {
                const res = await apiRequest(endpoints.schedule)
                if (res.ok) {
                    const data = await res.json()
                    const grouped = data.reduce((acc: any, item: any) => {
                        if (!acc[item.date]) acc[item.date] = []
                        acc[item.date].push(item)
                        return acc
                    }, {})
                    setGroupedData(grouped)
                }

                if (user?.id) {
                    const [subRes, bookRes] = await Promise.all([
                        apiRequest(endpoints.userSubscription(user.id)),
                        apiRequest(endpoints.userBookings(user.id))
                    ])

                    if (subRes.ok) {
                        const subs = await subRes.json()
                        setUserSubs(subs.filter((s: any) => s.status === 'active' && s.remaining_lessons > 0))
                    }

                    if (bookRes.ok) {
                        const bookings = await bookRes.json()
                        const ids = bookings
                            .filter((b: any) => b.status === 'confirmed' || b.status === 'attended')
                            .map((b: any) => Number(b.schedule_id))
                        setBookedScheduleIds(ids)
                    }
                }
            } catch (e) {
                console.error('Ошибка:', e)
                toast.error('Ошибка загрузки данных')
            } finally {
                setLoading(false)
            }
        }
        loadScheduleData()
    }, [user?.id])

    const handleBook = async (lessonId: number) => {
        if (!user?.fullName) return toast.error('Пожалуйста, зарегистрируйтесь в профиле')

        // Находим занятие для финальной проверки времени перед запросом
        const allItems = Object.values(groupedData).flat();
        const lesson = allItems.find(i => i.id === lessonId);
        if (lesson && isRegistrationClosed(lesson.date, lesson.time)) {
            return toast.error('Запись на это занятие уже закрыта');
        }

        const hasActiveSub = userSubs.length > 0
        const subId = hasActiveSub ? userSubs[0].id : null

        setBookingLoading(lessonId)
        try {
            const res = await apiRequest(endpoints.bookings, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user.id,
                    schedule_id: lessonId,
                    subscription_id: subId
                })
            })

            if (res.ok) {
                if (!hasActiveSub) {
                    toast.success(
                        <span>
                            Записано! <b>Без абонемента.</b> Оплата в студии.
                        </span>,
                        { duration: 6000, icon: '💳' }
                    )
                } else {
                    toast.success('Вы успешно записаны!')
                }
                setBookedScheduleIds(prev => [...prev, lessonId])
            } else {
                const error = await res.json()
                toast.error(error.message || 'Ошибка записи')
            }
        } catch (e) {
            toast.error('Ошибка сети')
        } finally {
            setBookingLoading(null)
        }
    }

    const getLevelInfo = (level: string) => {
        switch (level) {
            case 'beginners': return { label: 'Новички', class: 'tag-beginners', icon: '🐣' }
            case 'advanced': return { label: 'Профи', class: 'tag-advanced', icon: '🔥' }
            default: return { label: 'Любой уровень', class: 'tag-any', icon: '✨' }
        }
    }

    const getAgeInfo = (age: string) => {
        switch (age) {
            case 'children': return { label: 'Дети', icon: '👶' }
            case 'adults': return { label: 'Взрослые', icon: '💃' }
            default: return { label: 'Любой Возраст', icon: '👥' }
        }
    }

    if (loading) return <div className="loader-container"><div className="spinner"></div></div>

    return (
        <div className="schedule-container">
            <h1 className="page-title">Расписание</h1>
            <AnimatePresence>
                {Object.keys(groupedData).length === 0 ? (
                    <div className="empty-state">На ближайшее время занятий нет</div>
                ) : (
                    Object.entries(groupedData).map(([date, items]) => (
                        <div key={date} className="date-group">
                            <div className="date-header">
                                {new Date(date).toLocaleDateString('ru-RU', {
                                    weekday: 'short', day: 'numeric', month: 'long'
                                })}
                            </div>

                            {items.map((item: any) => {
                                const level = getLevelInfo(item.level)
                                const age = getAgeInfo(item.age_category)
                                const isCancelled = item.status === 'cancelled'
                                const isAlreadyBooked = bookedScheduleIds.includes(Number(item.id))

                                // 2. ВЫЧИСЛЯЕМ ДОСТУПНОСТЬ ПО ВРЕМЕНИ
                                const isTimeOut = isRegistrationClosed(item.date, item.time);

                                // Кнопка неактивна если: отменено, уже записан ИЛИ время вышло
                                const isDisabled = isCancelled || isAlreadyBooked || isTimeOut || bookingLoading === item.id;

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={item.id}
                                        className={`lesson-card ${isCancelled ? 'cancelled' : ''} ${isAlreadyBooked ? 'booked' : ''} ${isTimeOut && !isAlreadyBooked ? 'timeout' : ''}`}
                                    >
                                        <div className="card-top">
                                            <div className="time-col">
                                                <span className="time-start">{item.time?.slice(0, 5)}</span>
                                                <span className="time-end">{item.end_time?.slice(0, 5)}</span>
                                            </div>
                                            <div className="info-col">
                                                <div className="lesson-name">
                                                    {isCancelled ? <s>{item.classes?.name}</s> : item.classes?.name}
                                                </div>
                                                <div className="teacher-name">
                                                    👤 {item.teacher?.first_name} {item.teacher?.last_name}
                                                </div>
                                                <div className="tags-row">
                                                    <span className={`compact-tag ${level.class}`}>
                                                        {level.icon} {level.label}
                                                    </span>
                                                    <span className="compact-tag tag-age">
                                                        {age.icon} {age.label}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            className={`book-btn ${isDisabled ? 'disabled' : ''} ${bookingLoading === item.id ? 'loading' : ''}`}
                                            disabled={isDisabled}
                                            onClick={() => handleBook(item.id)}
                                        >
                                            {isCancelled
                                                ? 'Отменено'
                                                : isAlreadyBooked
                                                    ? 'Вы записаны'
                                                    : isTimeOut
                                                        ? 'Запись закрыта' // Текст для опоздавших
                                                        : bookingLoading === item.id
                                                            ? 'Запись...'
                                                            : 'Записаться'}
                                        </button>
                                    </motion.div>
                                )
                            })}
                        </div>
                    ))
                )}
            </AnimatePresence>
        </div>
    )
}
