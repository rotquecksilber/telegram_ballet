import '../styles/Schedule.css'
import { useEffect, useState } from 'react'
import { apiRequest, endpoints } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserStore } from '../store/userStore'
import toast from 'react-hot-toast'

// 1. Словарь переводов
const translations = {
    ru: {
        pageTitle: 'Расписание',
        emptyState: 'На ближайшее время занятий нет',
        teacherLabel: '👤',
        registerPrompt: 'Пожалуйста, зарегистрируйтесь в профиле',
        regClosedToast: 'Запись на это занятие уже закрыта',
        bookedNoSub: (<span>Записано! <b>Без абонемента.</b> Оплата в студии.</span>),
        bookedSuccess: 'Вы успешно записаны!',
        networkError: 'Ошибка сети',
        loadError: 'Ошибка загрузки данных',
        booking: 'Запись...',
        bookBtn: 'Записаться',
        bookedBtn: 'Вы записаны',
        cancelledBtn: 'Отменено',
        closedBtn: 'Запись закрыта',
        levels: {
            beginners: { label: 'Новички', icon: '🐣' },
            advanced: { label: 'Профи', icon: '🔥' },
            any: { label: 'Любой уровень', icon: '✨' }
        },
        ages: {
            children: { label: 'Дети', icon: '👶' },
            adults: { label: 'Взрослые', icon: '💃' },
            any: { label: 'Любой Возраст', icon: '👥' }
        }
    },
    en: {
        pageTitle: 'Schedule',
        emptyState: 'No classes scheduled for nearest time',
        teacherLabel: '👤',
        registerPrompt: 'Please complete registration in your profile',
        regClosedToast: 'Registration for this class is already closed',
        bookedNoSub: (<span>Booked! <b>No subscription.</b> Pay at the studio.</span>),
        bookedSuccess: 'Successfully booked!',
        networkError: 'Network error',
        loadError: 'Failed to load data',
        booking: 'Booking...',
        bookBtn: 'Book Now',
        bookedBtn: 'Booked',
        cancelledBtn: 'Cancelled',
        closedBtn: 'Closed',
        levels: {
            beginners: { label: 'Beginners', icon: '🐣' },
            advanced: { label: 'Pro', icon: '🔥' },
            any: { label: 'All Levels', icon: '✨' }
        },
        ages: {
            children: { label: 'Kids', icon: '👶' },
            adults: { label: 'Adults', icon: '💃' },
            any: { label: 'All Ages', icon: '👥' }
        }
    }
}

export const Schedule = () => {
    // Инициализация языка из localStorage
    const [lang, setLang] = useState<'ru' | 'en'>(() => {
        const saved = localStorage.getItem('user_lang');
        return (saved === 'en' || saved === 'ru') ? saved : 'ru';
    });

    const t = translations[lang];

    const { user } = useUserStore()
    const [groupedData, setGroupedData] = useState<Record<string, any[]>>({})
    const [loading, setLoading] = useState(true)
    const [bookingLoading, setBookingLoading] = useState<number | null>(null)
    const [userSubs, setUserSubs] = useState<any[]>([])
    const [bookedScheduleIds, setBookedScheduleIds] = useState<number[]>([])

    // Функция смены языка с сохранением
    const handleLangChange = (newLang: 'ru' | 'en') => {
        setLang(newLang);
        localStorage.setItem('user_lang', newLang);
    };

    const isRegistrationClosed = (date: string, time: string) => {
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        const lessonDate = new Date(year, month - 1, day, hours, minutes);
        const now = new Date();
        const diffMs = lessonDate.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);
        return diffMins <= 60;
    };

    useEffect(() => {
        const loadScheduleData = async () => {
            try {
                const res = await apiRequest(endpoints.schedule)
                if (res.ok) {
                    const data = await res.json()
                    const now = new Date()
                    const futureLessons = data.filter((item: any) => {
                        const [year, month, day] = item.date.split('-').map(Number)
                        const lessonDate = new Date(year, month - 1, day)
                        return lessonDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    })
                    const grouped = futureLessons.reduce((acc: any, item: any) => {
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
                toast.error(t.loadError)
            } finally {
                setLoading(false)
            }
        }
        loadScheduleData()
    }, [user?.id, t.loadError])

    const handleBook = async (lessonId: number) => {
        if (!user?.fullName) return toast.error(t.registerPrompt)

        const allItems = Object.values(groupedData).flat();
        const lesson = allItems.find(i => i.id === lessonId);
        if (lesson && (isRegistrationClosed(lesson.date, lesson.time) || lesson.status === 'closed')) {
            return toast.error(t.regClosedToast);
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
                    toast.success(t.bookedNoSub, { duration: 6000, icon: '💳' })
                } else {
                    toast.success(t.bookedSuccess)
                }
                setBookedScheduleIds(prev => [...prev, lessonId])
            } else {
                const error = await res.json()
                toast.error(error.message || 'Error')
            }
        } catch (e) {
            toast.error(t.networkError)
        } finally {
            setBookingLoading(null)
        }
    }

    const getLevelInfo = (level: string) => {
        const key = level as keyof typeof t.levels;
        const info = t.levels[key] || t.levels.any;
        return { ...info, class: `tag-${level || 'any'}` };
    }

    const getAgeInfo = (age: string) => {
        const key = age as keyof typeof t.ages;
        return t.ages[key] || t.ages.any;
    }

    if (loading) return <div className="loader-container"><div className="spinner"></div></div>

    return (
        <div className="schedule-container">
            {/* Переключатель языка */}
            <div className="lang-selector-container" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                <div className="lang-segmented-control">
                    <button
                        className={`lang-option ${lang === 'ru' ? 'active' : ''}`}
                        onClick={() => handleLangChange('ru')}
                    >
                        RU
                    </button>
                    <button
                        className={`lang-option ${lang === 'en' ? 'active' : ''}`}
                        onClick={() => handleLangChange('en')}
                    >
                        EN
                    </button>
                    <div className={`lang-slider ${lang}`} />
                </div>
            </div>

            <h1 className="page-title">{t.pageTitle}</h1>

            <AnimatePresence>
                {Object.keys(groupedData).length === 0 ? (
                    <div className="empty-state">{t.emptyState}</div>
                ) : (
                    Object.entries(groupedData).map(([date, items]) => (
                        <div key={date} className="date-group">
                            <div className="date-header">
                                {new Date(date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
                                    weekday: 'short', day: 'numeric', month: 'long'
                                })}
                            </div>

                            {items.map((item: any) => {
                                const level = getLevelInfo(item.level)
                                const age = getAgeInfo(item.age_category)
                                const isCancelled = item.status === 'cancelled'
                                const isClosed = item.status === 'closed'
                                const isAlreadyBooked = bookedScheduleIds.includes(Number(item.id))
                                const isTimeOut = isRegistrationClosed(item.date, item.time);
                                const isDisabled = isCancelled || isClosed || isAlreadyBooked || isTimeOut || bookingLoading === item.id;

                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={item.id}
                                        className={`lesson-card ${isCancelled ? 'cancelled' : ''} ${isAlreadyBooked ? 'booked' : ''} ${(isTimeOut || isClosed) && !isAlreadyBooked ? 'timeout' : ''}`}
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
                                                    {t.teacherLabel} {item.teacher?.first_name} {item.teacher?.last_name}
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
                                                ? t.cancelledBtn
                                                : isAlreadyBooked
                                                    ? t.bookedBtn
                                                    : isTimeOut || isClosed
                                                        ? t.closedBtn
                                                        : bookingLoading === item.id
                                                            ? t.booking
                                                            : t.bookBtn}
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
