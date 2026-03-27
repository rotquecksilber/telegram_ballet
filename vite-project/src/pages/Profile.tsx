import '../styles/Profile.css'
import {useEffect, useState, useCallback} from 'react'
import { useUserStore } from '../store/userStore'
import { endpoints, apiRequest } from '../lib/api.ts'
import toast from 'react-hot-toast'
// import {MOTIVATION_FACTS} from "../../quotes.ts";

interface ProfileProps {
    onRegisterSuccess: () => void
}

export const Profile = ({ onRegisterSuccess }: ProfileProps) => {
    const { user, setUser } = useUserStore()

    const [isSubLoading, setIsSubLoading] = useState(true)
    const [isBookingsLoading, setIsBookingsLoading] = useState(true)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [bookings, setBookings] = useState<any[]>([])
    const [schedules, setSchedules] = useState<any[]>([])

    // Поля регистрации
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)

    // Проверка: закрыта ли отмена (меньше 180 минут до начала)
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
                const errorText = await response.text().catch(() => 'нет текста')
                throw new Error(`Сервер: ${response.status} — ${errorText}`)
            }

            const rawText = await response.text()
            let data
            try {
                data = JSON.parse(rawText)
            } catch {
                toast.error('Сервер вернул невалидный JSON')
                return
            }

            if (!data.success || !data.link) {
                toast.error(data.error || 'Не удалось получить ссылку на оплату')
                return
            }

            const link = data.link

            if (typeof link !== 'string' || !link.startsWith('https://t.me/')) {
                toast.error(`Некорректная ссылка: ${link}`)
                return
            }

            window.Telegram?.WebApp.openInvoice(link, (status: string) => {
                if (status === 'paid') {
                    toast.success('Спасибо огромное! ❤️⭐')
                } else if (status === 'cancelled') {
                    toast('Оплата отменена', { icon: 'ℹ️', duration: 4000 })
                } else if (status === 'failed') {
                    toast.error('Не удалось провести оплату')
                }
            })
        } catch (err: any) {
            toast.error(
                err.message?.includes('fetch')
                    ? 'Не удалось подключиться к серверу'
                    : 'Ошибка при создании доната'
            )
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
            console.error('Ошибка загрузки данных профиля:', e)
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
        if (!firstName || !lastName || !phone) return toast.error('Заполните все поля')
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

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Ошибка регистрации')
            }

            const savedUser = await response.json()

            setUser({
                ...user!,
                fullName: `${savedUser.first_name} ${savedUser.last_name}`,
                phone: savedUser.phone,
                isAdmin: savedUser.is_admin,
                isTeacher: savedUser.is_teacher,
            })

            toast.success('Регистрация завершена!')
            onRegisterSuccess()
        } catch (err: any) {
            toast.error(err.message || 'Не удалось зарегистрироваться')
        } finally {
            setLoading(false)
        }
    }

    const handleCancelBooking = async (bookingId: number) => {
        if (!window.confirm('Вы уверены, что хотите отменить запись?')) return
        try {
            const res = await apiRequest(`${endpoints.bookings}/${bookingId}/cancel`, {
                method: 'PATCH',
            })
            const result = await res.json()
            if (res.ok) {
                toast.success(result.message)
                if (user?.id) loadUserData(user.id)
            } else {
                toast.error(result.message || 'Ошибка отмены')
            }
        } catch (e) {
            toast.error('Ошибка сети')
        }
    }

    // ─── Фильтр — только текущий месяц ────────────────────────────────
    const now = new Date()
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const recentBookings = bookings.filter((book) => {
        const lessonDate = new Date(book.schedule?.date || book.created_at)
        return lessonDate >= firstDayOfCurrentMonth
    })

    // ─── Группировка по неделям ────────────────────────────────
    const groupedByWeek = recentBookings.reduce((acc: Record<string, any[]>, book) => {
        const date = new Date(book.schedule?.date || book.created_at)

        // Начало недели — понедельник
        const dayOfWeek = date.getDay()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(date)
        monday.setDate(date.getDate() + diff)

        const weekKey = monday.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }) // пример: "10 мар. 2025"

        if (!acc[weekKey]) acc[weekKey] = []
        acc[weekKey].push(book)
        return acc
    }, {})

    // Сортировка недель от новых к старым
    const sortedWeeks = Object.entries(groupedByWeek).sort(([a], [b]) => {
        const dateA = new Date(a.split(' ').reverse().join('-').replace(/[а-яА-Я.]+/g, (m) => {
            const months: Record<string, string> = {
                янв: '01', фев: '02', мар: '03', апр: '04', май: '05', июн: '06',
                июл: '07', авг: '08', сен: '09', окт: '10', ноя: '11', дек: '12',
            }
            return months[m.toLowerCase()] || '01'
        }))
        const dateB = new Date(b.split(' ').reverse().join('-').replace(/[а-яА-Я.]+/g, (m) => {
            const months: Record<string, string> = {
                янв: '01', фев: '02', мар: '03', апр: '04', май: '05', июн: '06',
                июл: '07', авг: '08', сен: '09', окт: '10', ноя: '11', дек: '12',
            }
            return months[m.toLowerCase()] || '01'
        }))
        return dateB.getTime() - dateA.getTime()
    })

    // const dailyFact = useMemo(() => {
    //     const now = new Date();
    //     // Создаем уникальное число для каждого дня (например, 20260318)
    //     const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    //
    //     // Используем остаток от деления, чтобы индекс всегда был в пределах массива
    //     const index = dateSeed % MOTIVATION_FACTS.length;
    //
    //     return MOTIVATION_FACTS[index];
    // }, []);

    // Считаем посещенные занятия в этом месяце
    const attendedCount = recentBookings.filter(book => book.status === 'attended').length;


    const getMilestone = (count: number) => {
        // 24+ занятия: "Космический закат" (Фиолетово-розовый взрыв)
        if (count >= 24) return {
            label: 'Легенда студии! 🔥',
            color: 'linear-gradient(135deg, #FF0080 0%, #7928CA 100%)'
        };

        // 16+ занятия: "Электрик" (Насыщенный синий-голубой)
        if (count >= 16) return {
            label: 'Вы в отличной форме! 💪',
            color: 'linear-gradient(135deg, #007CF0 0%, #00DFD8 100%)'
        };

        // 8+ занятия: "Сочный апельсин" (Вместо того дурацкого серого)
        if (count >= 8)  return {
            label: 'Так держать! 🚀',
            color: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
        };

        // 4+ занятия: "Свежая мята"
        if (count >= 4)  return {
            label: 'Хорошее начало! ✨',
            color: 'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)'
        };

        return {
            label: 'Занимайтесь чаще ✨',
            color: 'var(--tg-theme-button-color)'
        };
    };

    const milestone = getMilestone(attendedCount);
    const progressPercent = Math.min((attendedCount / 24) * 100, 100);

    if (user?.fullName) {
        return (
            <div className="profile-view">
                <h2 className="section-title">Мой абонемент</h2>

                {isSubLoading ? (
                    <div className="subscription-skeleton"></div>
                ) : subscriptions.length > 0 ? (
                    subscriptions.map((sub) => {
                        const isActivated = !!sub.activation_date
                        return (
                            <div key={sub.id} className="subscription-card">
                                <div className="sub-main">
                                    <div className="sub-info">
                                        <span className="sub-label">Осталось занятий</span>
                                        <span className="sub-count">
                      {sub.remaining_lessons} <span className="total">/ {sub.total_lessons || 8}</span>
                    </span>
                                    </div>
                                    <div
                                        className={`sub-status-tag ${sub.is_frozen ? 'frozen' : isActivated ? 'active' : 'pending'}`}
                                    >
                                        {sub.is_frozen ? 'Заморожен' : isActivated ? 'Активен' : 'Ждет активации'}
                                    </div>
                                </div>
                                <div className="sub-progress">
                                    <div
                                        className="sub-progress-fill"
                                        style={{
                                            width: `${Math.min((sub.remaining_lessons / (sub.total_lessons || 1)) * 100, 100)}%`,
                                        }}
                                    />
                                </div>
                                <div className="sub-details">
                                    <span>Срок действия:</span>
                                    <span>
                    {isActivated
                        ? `до ${new Date(sub.expiry_date).toLocaleDateString('ru-RU')}`
                        : 'Активируется при первом посещении'}
                  </span>
                                </div>
                                {!isActivated && (
                                    <div className="sub-activation-info"
                                         style={{fontSize: '11px', marginTop: '4px', opacity: 0.7}}>
                                        * Будет действовать {sub.duration_days} дней с момента начала
                                    </div>
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="no-subscription">
                        <div className="no-sub-icon">🎫</div>
                        <p>У вас нет активных абонементов</p>
                    </div>
                )}

                <div className="achievement-card">
                    <div className="achievement-header">
                        <span className="achievement-title">Активность за месяц</span>
                        <span className="achievement-count">{attendedCount}</span>
                    </div>

                    <div className="progress-container">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: `${progressPercent || 2}%`, // 2% чтобы даже при 0 был виден край
                                background: milestone.color
                            }}
                        >
                            <div className="progress-glow"/>
                        </div>

                        {[4, 8, 16, 24].map(m => (
                            <div
                                key={m}
                                className={`milestone-dot ${attendedCount >= m ? 'reached' : ''}`}
                                style={{left: `${(m / 24) * 100}%`}}
                            >
                                <span className="milestone-number">{m}</span>
                            </div>
                        ))}
                    </div>
                    <p className="achievement-message">{milestone.label}</p>
                </div>


                <div className="recordings-section">
                    <h2 className="section-title mt-24">Мои записи (текущий месяц)</h2>

                    {isBookingsLoading ? (
                        <div className="skeleton-line"></div>
                    ) : recentBookings.length > 0 ? (
                        sortedWeeks.map(([weekLabel, items]: [string, any[]]) => (
                            <details key={weekLabel} className="week-accordion">
                                <summary className="week-summary">
                                    {weekLabel} <span className="badge">{items.length}</span>
                                </summary>

                                <div className="week-content">
                                    {items.map((book: any) => {
                                        const currentSchedule = schedules.find((s) => s.id === book.schedule_id)
                                        const isScheduleCancelled = currentSchedule?.status === 'cancelled'
                                        const isTooLateToCancel = isCancelationClosed(book.schedule?.date, book.schedule?.time)

                                        return (
                                            <div
                                                key={book.id}
                                                className={`booking-cell ${isScheduleCancelled ? 'is-cancelled' : ''}`}
                                            >
                                                <div className="booking-content">
                                                    <div className="booking-title-row">
                          <span className="booking-name">
                            {isScheduleCancelled ? (
                                <s>{book.schedule?.classes?.name}</s>
                            ) : (
                                book.schedule?.classes?.name
                            )}
                          </span>

                                                        {isScheduleCancelled && (
                                                            <span className="status-label-alert">ОТМЕНЕНО СТУДИЕЙ</span>
                                                        )}
                                                    </div>

                                                    <div className="booking-date-text">
                                                        {new Date(book.schedule?.date).toLocaleDateString('ru-RU', {
                                                            weekday: 'short',
                                                            day: 'numeric',
                                                            month: 'short',
                                                        })}{' '}
                                                        • {book.schedule?.time?.slice(0, 5)}
                                                    </div>
                                                </div>

                                                <div className="booking-side-action">
                                                    {!isScheduleCancelled && book.status === 'confirmed' ? (
                                                        isTooLateToCancel ? (
                                                            <span
                                                                className="status-confirmed-text">Запись активна</span>
                                                        ) : (
                                                            <button
                                                                className="cancel-minimal-btn"
                                                                onClick={() => handleCancelBooking(book.id)}
                                                            >
                                                                Отменить
                                                            </button>
                                                        )
                                                    ) : (
                                                        book.status !== 'confirmed' &&
                                                        !isScheduleCancelled && (
                                                            <span className="status-final-text">
                              {book.status === 'attended' ? '✅ Посещено' : 'Отменено'}
                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </details>
                        ))
                    ) : (
                        <p className="empty-text">В этом месяце у вас нет записей</p>
                    )}
                </div>


                {/*    <div className="daily-fact-card">*/}
                {/*        <div className="fact-accent-line" style={{background: milestone.color}}/>*/}
                {/*        <div className="fact-content">*/}
                {/*            <div className="fact-top">*/}
                {/*                <span className="fact-tag">Интересно сегодня</span>*/}
                {/*                <span className="fact-date">*/}
                {/*    {new Date().toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})}*/}
                {/*</span>*/}
                {/*            </div>*/}
                {/*            <p className="fact-text">«{dailyFact}»</p>*/}
                {/*        </div>*/}
                {/*    </div>*/}

                <div className="info-card mt-24">
                    <div className="info-item">
                        <span className="label">Статус</span>
                        <span
                            className={`status-badge ${user.isAdmin ? 'admin' : user.isTeacher ? 'teacher' : ''}`}>
              {user.isAdmin ? 'Администратор' : user.isTeacher ? 'Преподаватель' : 'Ученик'}
            </span>
                    </div>
                    <div className="info-item">
                        <span className="label">Ученик</span>
                        <span className="value">{user.fullName}</span>
                    </div>
                    <div className="info-item">
                        <span className="label">Телефон</span>
                        <span className="value">{user.phone}</span>
                    </div>
                </div>

                <button
                    className="donate-btn mt-24"
                    onClick={handleDonate}
                    style={{
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
                        gap: '8px',
                    }}
                >
                    ⭐ Поддержать разработку (100 звезд)
                </button>


            </div>
        )
    }

    return (
        <div className="registration-container">
            <h2 className="section-title">Регистрация</h2>
            <div className="registration-form">
                <div className="form-group">
                    <label>Имя</label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Введите имя"
                    />
                </div>
                <div className="form-group">
                    <label>Фамилия</label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Введите фамилию"
                    />
                </div>
                <div className="form-group">
                    <label>Телефон</label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder=""
                    />
                </div>
                <button className="submit-btn" onClick={handleRegister} disabled={loading}>
                            {loading ? 'Создаем профиль...' : 'Зарегистрироваться'}
                        </button>
                    </div>
                </div>
                )
                }
