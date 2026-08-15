import '../styles/Profile.css'
import {useEffect, useState, useCallback} from 'react'
import { useUserStore } from '../store/userStore'
import { endpoints, apiRequest } from '../lib/api.ts'
import toast from 'react-hot-toast'

// Объект с переводами
const translations = {
    ru: {
        mySubscription: 'Мой абонемент',
        lessonsLeft: 'Осталось занятий',
        frozen: 'Заморожен',
        active: 'Активен',
        pending: '⏳ Ждет активации',
        expiryDate: 'Срок действия:',
        expiresOn: 'до',
        startsOnFirstVisit: 'Начнётся с первого занятия',
        activationInfo: (days: number) => `Отсчёт ${days} дней начнётся, как только вы сходите на первое занятие по этому абонементу.`,
        noSub: 'У вас нет активных абонементов',
        monthlyActivity: 'Активность за месяц',
        myBookings: 'Мои записи (текущий месяц)',
        noBookings: 'В этом месяце у вас нет записей',
        cancelledByStudio: 'ОТМЕНЕНО СТУДИЕЙ',
        bookingActive: 'Запись активна',
        cancel: 'Отменить',
        attended: '✅ Посещено',
        cancelled: 'Отменено',
        status: 'Статус',
        admin: 'Администратор',
        teacher: 'Преподаватель',
        student: 'Ученик',
        phone: 'Телефон',
        donate: '⭐ Поддержать разработку (100 звезд)',
        registration: 'Регистрация',
        firstName: 'Имя',
        lastName: 'Фамилия',
        placeholderName: 'Введите имя',
        placeholderLastName: 'Введите фамилию',
        registerBtn: 'Зарегистрироваться',
        creatingProfile: 'Создаем профиль...',
        fillFields: 'Заполните все поля',
        regSuccess: 'Регистрация завершена!',
        confirmCancel: 'Вы уверены, что хотите отменить запись?',
        milestones: [
            { count: 24, label: 'Легенда студии! 🔥' },
            { count: 16, label: 'Вы в отличной форме! 💪' },
            { count: 8, label: 'Так держать! 🚀' },
            { count: 4, label: 'Хорошее начало! ✨' },
            { count: 0, label: 'Занимайтесь чаще ✨' }
        ]
    },
    en: {
        mySubscription: 'My Subscription',
        lessonsLeft: 'Lessons left',
        frozen: 'Frozen',
        active: 'Active',
        pending: '⏳ Pending activation',
        expiryDate: 'Expiry date:',
        expiresOn: 'until',
        startsOnFirstVisit: 'Starts on your first class',
        activationInfo: (days: number) => `The ${days}-day countdown starts as soon as you attend your first class on this subscription.`,
        noSub: 'No active subscriptions',
        monthlyActivity: 'Monthly Activity',
        myBookings: 'My Bookings (current month)',
        noBookings: 'No bookings this month',
        cancelledByStudio: 'CANCELLED BY STUDIO',
        bookingActive: 'Booking active',
        cancel: 'Cancel',
        attended: '✅ Attended',
        cancelled: 'Cancelled',
        status: 'Status',
        admin: 'Administrator',
        teacher: 'Teacher',
        student: 'Student',
        phone: 'Phone',
        donate: '⭐ Support development (100 stars)',
        registration: 'Registration',
        firstName: 'First Name',
        lastName: 'Last Name',
        placeholderName: 'Enter first name',
        placeholderLastName: 'Enter last name',
        registerBtn: 'Register',
        creatingProfile: 'Creating profile...',
        fillFields: 'Please fill all fields',
        regSuccess: 'Registration complete!',
        confirmCancel: 'Are you sure you want to cancel?',
        milestones: [
            { count: 24, label: 'Studio Legend! 🔥' },
            { count: 16, label: 'You are in great shape! 💪' },
            { count: 8, label: 'Keep it up! 🚀' },
            { count: 4, label: 'Good start! ✨' },
            { count: 0, label: 'Practice more often ✨' }
        ]
    }
}

interface ProfileProps {
    onRegisterSuccess: () => void
}

export const Profile = ({ onRegisterSuccess }: ProfileProps) => {
    // 1. Инициализация из localStorage
    const [lang, setLang] = useState<'ru' | 'en'>(() => {
        const saved = localStorage.getItem('user_lang');
        return (saved === 'en' || saved === 'ru') ? saved : 'ru';
    });

    const t = translations[lang]

    const { user, setUser } = useUserStore()

    const [isSubLoading, setIsSubLoading] = useState(true)
    const [isBookingsLoading, setIsBookingsLoading] = useState(true)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [bookings, setBookings] = useState<any[]>([])
    const [schedules, setSchedules] = useState<any[]>([])

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)

    // 2. Функция смены языка с сохранением
    const handleLangChange = (newLang: 'ru' | 'en') => {
        setLang(newLang);
        localStorage.setItem('user_lang', newLang);
    };

    const isCancelationClosed = (dateStr?: string, timeStr?: string) => {
        if (!dateStr || !timeStr) return false
        const [year, month, day] = dateStr.split('-').map(Number)
        const [hours, minutes] = timeStr.split(':').map(Number)
        const lessonDate = new Date(year, month - 1, day, hours, minutes)
        const now = new Date()
        const diffMs = lessonDate.getTime() - now.getTime()
        const diffMins = diffMs / (1000 * 60)
        return diffMins <= 180
    }

    const handleDonate = async () => {
        try {
            const response = await fetch(endpoints.donate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id }),
            })

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'error')
                throw new Error(`Server: ${response.status} — ${errorText}`)
            }

            const rawText = await response.text()
            let data = JSON.parse(rawText)

            if (!data.success || !data.link) {
                toast.error(data.error || 'Link error')
                return
            }

            window.Telegram?.WebApp.openInvoice(data.link, (status: string) => {
                if (status === 'paid') toast.success('❤️⭐')
            })
        } catch (err: any) {
            toast.error('Error')
        }
    }

    const loadUserData = useCallback(async (tgId: number) => {
        setIsSubLoading(true)
        setIsBookingsLoading(true)
        try {
            const subRes = await apiRequest(endpoints.userSubscription(tgId))
            if (subRes.ok) setSubscriptions(await subRes.json())
            const bookRes = await apiRequest(endpoints.userBookings(tgId))
            if (bookRes.ok) setBookings(await bookRes.json())
            const schedRes = await apiRequest(endpoints.schedule)
            if (schedRes.ok) setSchedules(await schedRes.json())
        } catch (e) {
            console.error(e)
        } finally {
            setIsSubLoading(false)
            setIsBookingsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (user?.id && user?.fullName) {
            loadUserData(user.id)
        }
    }, [user?.id, user?.fullName, loadUserData])

    const handleRegister = async () => {
        if (!firstName || !lastName || !phone) return toast.error(t.fillFields)
        setLoading(true)
        try {
            const response = await apiRequest(endpoints.register, {
                method: 'POST',
                body: JSON.stringify({
                    telegram_id: user?.id,
                    username: user?.username || `user_${user?.id}`,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    phone: phone.trim(),
                }),
            })
            if (!response.ok) throw new Error()
            const savedUser = await response.json()
            setUser({
                ...user!,
                fullName: `${savedUser.first_name} ${savedUser.last_name}`,
                phone: savedUser.phone,
                isAdmin: savedUser.is_admin,
                isTeacher: savedUser.is_teacher,
            })
            toast.success(t.regSuccess)
            onRegisterSuccess()
        } catch (err: any) {
            toast.error('Error')
        } finally {
            setLoading(false)
        }
    }

    const handleCancelBooking = (bookingId: number) => {
        const doCancel = async () => {
            try {
                const res = await apiRequest(`${endpoints.bookings}/${bookingId}/cancel`, { method: 'PATCH' })
                if (res.ok) {
                    toast.success('OK')
                    if (user?.id) loadUserData(user.id)
                }
            } catch (e) {
                toast.error('Error')
            }
        }

        if (window.Telegram?.WebApp?.showConfirm) {
            window.Telegram.WebApp.showConfirm(t.confirmCancel, (confirmed: boolean) => {
                if (confirmed) doCancel()
            })
        } else {
            if (window.confirm(t.confirmCancel)) doCancel()
        }
    }

    const now = new Date()
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const recentBookings = bookings.filter((book) => {
        const lessonDate = new Date(book.schedule?.date || book.created_at)
        return lessonDate >= firstDayOfCurrentMonth
    })

    const groupedByWeek = recentBookings.reduce((acc: Record<string, any[]>, book) => {
        const date = new Date(book.schedule?.date || book.created_at)
        const dayOfWeek = date.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(date)
        monday.setDate(date.getDate() + diff)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
        const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
        const start = monday.toLocaleDateString(locale, formatOptions)
        const end = sunday.toLocaleDateString(locale, formatOptions)
        const weekKey = `${start} — ${end}`

        if (!acc[weekKey]) acc[weekKey] = []
        acc[weekKey].push(book)
        return acc
    }, {})

    const sortedWeeks = Object.entries(groupedByWeek).sort().reverse()

    const attendedCount = recentBookings.filter(book => book.status === 'attended').length

    const getMilestone = (count: number) => {
        const milestone = t.milestones.find(m => count >= m.count) || t.milestones[t.milestones.length - 1]
        const colors = [
            'linear-gradient(135deg, #FF0080 0%, #7928CA 100%)',
            'linear-gradient(135deg, #007CF0 0%, #00DFD8 100%)',
            'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)',
            'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
            'var(--color-accent)'
        ]
        const colorIdx = t.milestones.findIndex(m => m.count === milestone.count)
        return { label: milestone.label, color: colors[colorIdx] }
    }

    const milestone = getMilestone(attendedCount)
    const progressPercent = Math.min((attendedCount / 24) * 100, 100)

    if (user?.fullName) {
        return (
            <div className="profile-view">
                <div className="lang-selector-container">
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
                        <div className={`lang-slider ${lang}`}/>
                    </div>
                </div>
                <h2 className="section-title">{t.mySubscription}</h2>

                {isSubLoading ? (
                    <div className="subscription-skeleton"></div>
                ) : subscriptions.length > 0 ? (
                    subscriptions.map((sub) => {
                        const isActivated = !!sub.activation_date
                        return (
                            <div key={sub.id} className="subscription-card">
                                <div className="sub-main">
                                    <div className="sub-info">
                                        <span className="sub-label">{t.lessonsLeft}</span>
                                        <span className="sub-count">
                                            {sub.remaining_lessons} <span
                                            className="total">/ {sub.total_lessons || 8}</span>
                                        </span>
                                    </div>
                                    <div
                                        className={`sub-status-tag ${sub.is_frozen ? 'frozen' : isActivated ? 'active' : 'pending'}`}>
                                        {sub.is_frozen ? t.frozen : isActivated ? t.active : t.pending}
                                    </div>
                                </div>
                                <div className="sub-progress">
                                    <div className="sub-progress-fill"
                                         style={{width: `${Math.min((sub.remaining_lessons / (sub.total_lessons || 1)) * 100, 100)}%`}}/>
                                </div>
                                <div className="sub-details">
                                    <span>{t.expiryDate}</span>
                                    <span>
                                        {isActivated
                                            ? `${t.expiresOn} ${new Date(sub.expiry_date).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')}`
                                            : t.startsOnFirstVisit}
                                    </span>
                                </div>
                                {!isActivated && (
                                    <div className="sub-activation-banner">
                                        <span className="icon">⏳</span>
                                        <span>{t.activationInfo(sub.duration_days)}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="no-subscription">
                        <div className="no-sub-icon">🎫</div>
                        <p>{t.noSub}</p>
                    </div>
                )}

                {/* Остальной JSX профиля... */}
                <div className="achievement-card">
                    <div className="achievement-header">
                        <span className="achievement-title">{t.monthlyActivity}</span>
                        <span className="achievement-count">{attendedCount}</span>
                    </div>
                    <div className="progress-container">
                        <div className="progress-bar-fill"
                             style={{width: `${progressPercent || 2}%`, background: milestone.color}}>
                            <div className="progress-glow"/>
                        </div>
                        {[4, 8, 16, 24].map(m => (
                            <div key={m} className={`milestone-dot ${attendedCount >= m ? 'reached' : ''}`}
                                 style={{left: `${(m / 24) * 100}%`}}>
                                <span className="milestone-number">{m}</span>
                            </div>
                        ))}
                    </div>
                    <p className="achievement-message">{milestone.label}</p>
                </div>

                <div className="recordings-section">
                    <h2 className="section-title mt-24">{t.myBookings}</h2>
                    {isBookingsLoading ? (
                        <div className="skeleton-line"></div>
                    ) : recentBookings.length > 0 ? (
                        sortedWeeks.map(([weekLabel, items]: [string, any[]]) => (
                            <details key={weekLabel} className="week-accordion" open>
                                <summary className="week-summary">
                                    <span>{weekLabel}</span>
                                    <span className="badge">{items.length}</span>
                                </summary>
                                <div className="week-content">
                                    {items.map((book: any) => {
                                        const currentSchedule = schedules.find((s) => s.id === book.schedule_id)
                                        const isScheduleCancelled = currentSchedule?.status === 'cancelled'

                                        // ПРОВЕРКА: Закрыта ли отмена (меньше 3 часов до начала)
                                        const isTooLateToCancel = isCancelationClosed(book.schedule?.date, book.schedule?.time)

                                        const lessonDate = book.schedule?.date ? new Date(book.schedule.date) : null
                                        const dayNum = lessonDate?.getDate()
                                        const monthShort = lessonDate?.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' })

                                        const cellState =
                                            isScheduleCancelled ? 'studio-cancelled'
                                                : book.status === 'attended' ? 'attended'
                                                : book.status === 'confirmed' ? 'active'
                                                : 'cancelled'

                                        return (
                                            <div key={book.id} className={`booking-cell cell-${cellState}`}>
                                                <div className="booking-date-badge">
                                                    <span className="badge-day">{dayNum}</span>
                                                    <span className="badge-month">{monthShort}</span>
                                                </div>

                                                <div className="booking-content">
                                                    <div className="booking-title-row">
                                        <span className="booking-name">
                                            {isScheduleCancelled ?
                                                <s>{book.schedule?.classes?.name}</s> : book.schedule?.classes?.name}
                                        </span>
                                                    </div>
                                                    <div className="booking-date-text">
                                                        {book.schedule?.time?.slice(0, 5)}
                                                    </div>
                                                </div>

                                                {/* ЛОГИКА КНОПКИ ОТМЕНЫ / СТАТУСА */}
                                                <div className="booking-side-action">
                                                    {isScheduleCancelled ? (
                                                        <span className="status-pill status-pill--cancelled">{t.cancelledByStudio}</span>
                                                    ) : book.status === 'confirmed' ? (
                                                        isTooLateToCancel ? (
                                                            <span className="status-pill status-pill--active">{t.bookingActive}</span>
                                                        ) : (
                                                            <button
                                                                className="cancel-minimal-btn"
                                                                onClick={() => handleCancelBooking(book.id)}
                                                            >
                                                                {t.cancel}
                                                            </button>
                                                        )
                                                    ) : book.status === 'attended' ? (
                                                        <span className="status-pill status-pill--attended">{t.attended}</span>
                                                    ) : (
                                                        <span className="status-pill status-pill--cancelled">{t.cancelled}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </details>
                        ))
                    ) : (
                        <p className="empty-text">{t.noBookings}</p>
                    )}
                </div>

                <div className="info-card mt-24">
                    {/* 1 строка: Статус */}
                    <div className="info-item">
                        <span className="label">{t.status}</span>
                        <span className={`status-badge ${user.isAdmin ? 'admin' : user.isTeacher ? 'teacher' : ''}`}>
            {user.isAdmin ? t.admin : user.isTeacher ? t.teacher : t.student}
        </span>
                    </div>

                    {/* 2 строка: Имя (с инлайн-логикой перевода заголовка) */}
                    <div className="info-item">
        <span className="label">
            {lang === 'ru' ? 'Имя' : 'Full Name'}
        </span>
                        <span className="value">{user.fullName}</span>
                    </div>

                    {/* 3 строка: Телефон */}
                    <div className="info-item">
                        <span className="label">{t.phone}</span>
                        <span className="value">{user.phone}</span>
                    </div>
                </div>

                <button className="donate-btn mt-24" onClick={handleDonate} style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    marginTop: '15px',
                    marginBottom: '15px',
                    borderRadius: '12px',
                    fontWeight: '600',
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    color: '#000',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {t.donate}
                </button>
            </div>
        )
    }

    return (
        <div className="registration-container">
            <div className="lang-selector-container">
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
                    <div className={`lang-slider ${lang}`}/>
                </div>
            </div>
            <h2 className="section-title">{t.registration}</h2>
            <div className="registration-form">
                <div className="form-group">
                    <label>{t.firstName}</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                           placeholder={t.placeholderName}/>
                </div>
                <div className="form-group">
                    <label>{t.lastName}</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                           placeholder={t.placeholderLastName}/>
                </div>
                <div className="form-group">
                    <label>{t.phone}</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder=""/>
                </div>
                <button className="submit-btn" onClick={handleRegister} disabled={loading}>
                    {loading ? t.creatingProfile : t.registerBtn}
                </button>
            </div>
        </div>
    )
}
