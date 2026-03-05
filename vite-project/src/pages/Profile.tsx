import '../styles/Profile.css'
import { useEffect, useState, useCallback } from 'react'
import { useUserStore } from '../store/userStore'
import { endpoints, apiRequest } from '../lib/api.ts'
import toast from 'react-hot-toast'

interface ProfileProps {
    onRegisterSuccess: () => void
}

export const Profile = ({ onRegisterSuccess }: ProfileProps) => {
    const { user, setUser } = useUserStore()

    const [isSubLoading, setIsSubLoading] = useState(true)
    const [isBookingsLoading, setIsBookingsLoading] = useState(true)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [bookings, setBookings] = useState<any[]>([])

    // Поля регистрации
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)

    // Функция проверки: закрыта ли отмена (меньше 60 минут до начала)
    const isCancelationClosed = (dateStr?: string, timeStr?: string) => {
        if (!dateStr || !timeStr) return false;

        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);

        const lessonDate = new Date(year, month - 1, day, hours, minutes);
        const now = new Date();

        const diffMs = lessonDate.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);

        // Блокируем, если осталось 60 минут или меньше
        return diffMins <= 180;
    };

    const loadUserData = useCallback(async (tgId: number) => {
        setIsSubLoading(true);
        setIsBookingsLoading(true);
        try {
            const subRes = await apiRequest(endpoints.userSubscription(tgId));
            if (subRes.ok) setSubscriptions(await subRes.json());

            const bookRes = await apiRequest(endpoints.userBookings(tgId));
            if (bookRes.ok) setBookings(await bookRes.json());
        } catch (e) {
            console.error('Ошибка загрузки данных профиля:', e);
        } finally {
            setIsSubLoading(false);
            setIsBookingsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.id && user?.fullName) {
            loadUserData(user.id);
        }
    }, [user?.id, user?.fullName, loadUserData]);

    const handleRegister = async () => {
        if (!firstName || !lastName || !phone) return toast.error('Заполните все поля');
        setLoading(true);
        try {
            const response = await apiRequest(endpoints.register, {
                method: 'POST',
                body: JSON.stringify({
                    telegram_id: user?.id,
                    username: user?.username || `user_${user?.id}`,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    phone: phone.trim()
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка регистрации');
            }

            const savedUser = await response.json();

            setUser({
                ...user!,
                fullName: `${savedUser.first_name} ${savedUser.last_name}`,
                phone: savedUser.phone,
                isAdmin: savedUser.is_admin,
                isTeacher: savedUser.is_teacher
            });

            toast.success('Регистрация завершена!');
            onRegisterSuccess();
        } catch (err: any) {
            toast.error(err.message || 'Не удалось зарегистрироваться');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async (bookingId: number) => {
        if (!window.confirm('Вы уверены, что хотите отменить запись?')) return;
        try {
            const res = await apiRequest(`${endpoints.bookings}/${bookingId}/cancel`, {
                method: 'PATCH'
            });
            const result = await res.json();
            if (res.ok) {
                toast.success(result.message);
                if (user?.id) loadUserData(user.id);
            } else {
                toast.error(result.message || 'Ошибка отмены');
            }
        } catch (e) {
            toast.error('Ошибка сети');
        }
    };

    const groupedBookings = bookings.reduce((acc: any, book) => {
        const date = new Date(book.schedule?.date || book.created_at);
        const month = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        if (!acc[month]) acc[month] = [];
        acc[month].push(book);
        return acc;
    }, {});

    if (user?.fullName) {
        return (
            <div className="profile-view">
                <h2 className="section-title">Мой абонемент</h2>

                {isSubLoading ? (
                    <div className="subscription-skeleton"></div>
                ) : subscriptions.length > 0 ? (
                    subscriptions.map((sub) => {
                        // Проверяем, был ли абонемент уже активирован (списано ли первое занятие)
                        const isActivated = !!sub.activation_date;

                        return (
                            <div key={sub.id} className="subscription-card">
                                <div className="sub-main">
                                    <div className="sub-info">
                                        <span className="sub-label">Осталось занятий</span>
                                        <span className="sub-count">
                            {sub.remaining_lessons} <span className="total">/ {sub.total_lessons || 8}</span>
                        </span>
                                    </div>
                                    {/* Добавляем класс pending, если еще не активирован */}
                                    <div className={`sub-status-tag ${sub.is_frozen ? 'frozen' : isActivated ? 'active' : 'pending'}`}>
                                        {sub.is_frozen ? 'Заморожен' : isActivated ? 'Активен' : 'Ждет активации'}
                                    </div>
                                </div>
                                <div className="sub-progress">
                                    <div
                                        className="sub-progress-fill"
                                        style={{ width: `${Math.min((sub.remaining_lessons / (sub.total_lessons || 1)) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="sub-details">
                                    <span>Срок действия:</span>
                                    {/* Логика отображения даты или подсказки */}
                                    <span>
                        {isActivated
                            ? `до ${new Date(sub.expiry_date).toLocaleDateString('ru-RU')}`
                            : 'Активируется при первом посещении'}
                    </span>
                                </div>

                                {/* Дополнительная строка с информацией о длительности для неактивированных */}
                                {!isActivated && (
                                    <div className="sub-activation-info" style={{fontSize: '11px', marginTop: '4px', opacity: 0.7}}>
                                        * Будет действовать {sub.duration_days} дней с момента начала
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="no-subscription">
                        <div className="no-sub-icon">🎫</div>
                        <p>У вас нет активных абонементов</p>
                    </div>
                )}

                <h2 className="section-title mt-24">Мои записи</h2>
                {isBookingsLoading ? (
                    <div className="skeleton-line"></div>
                ) : bookings.length > 0 ? (
                    Object.entries(groupedBookings).map(([month, items]: any) => (
                        <div key={month} className="month-group">
                            <div className="month-label">{month}</div>
                            {items.map((book: any) => {
                                const isTooLateToCancel = isCancelationClosed(book.schedule?.date, book.schedule?.time);
                                const isScheduleCancelled = book.schedule?.status === 'cancelled';
                                const displayStatus = isScheduleCancelled ? 'cancelled' : book.status;

                                return (
                                    <div key={book.id} className={`booking-item ${displayStatus}`}>
                                        <div className="booking-body">
                                            <div className="booking-main">
                    <span className="booking-name">
                        {isScheduleCancelled ? <s>{book.schedule?.classes?.name}</s> : book.schedule?.classes?.name}
                    </span>
                                                <span className="booking-meta">
                        {new Date(book.schedule?.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} • {book.schedule?.time?.slice(0, 5)}
                    </span>
                                            </div>

                                            <div className="booking-aside">
                                                {isScheduleCancelled ? (
                                                    <span className="badge badge-error">Отменено студией</span>
                                                ) : book.status === 'confirmed' ? (
                                                    isTooLateToCancel ? (
                                                        <span className="badge badge-secondary">Запись активна</span>
                                                    ) : (
                                                        <button className="text-action-btn" onClick={() => handleCancelBooking(book.id)}>
                                                            Отменить
                                                        </button>
                                                    )
                                                ) : (
                                                    <span className={`badge ${book.status === 'attended' ? 'badge-success' : 'badge-secondary'}`}>
                            {book.status === 'attended' ? 'Посещено' : 'Отменено'}
                        </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Деликатная плашка оплаты, если нужно */}
                                        {displayStatus === 'confirmed' && !book.subscription_id && !isScheduleCancelled && (
                                            <div className="payment-footer">Оплата на месте</div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))
                ) : <p className="empty-text">Вы еще не записывались на занятия</p>}

                <div className="info-card mt-24">
                    <div className="info-item">
                        <span className="label">Статус</span>
                        <span className={`status-badge ${user.isAdmin ? 'admin' : user.isTeacher ? 'teacher' : ''}`}>
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
            </div>
        )
    }

    return (
        <div className="registration-container">
            <h2 className="section-title">Регистрация</h2>
            <div className="registration-form">
                <div className="form-group">
                    <label>Имя</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Введите имя" />
                </div>
                <div className="form-group">
                    <label>Фамилия</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Введите фамилию" />
                </div>
                <div className="form-group">
                    <label>Телефон</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="" />
                </div>
                <button className="submit-btn" onClick={handleRegister} disabled={loading}>
                    {loading ? 'Создаем профиль...' : 'Зарегистрироваться'}
                </button>
            </div>
        </div>
    )
}
