import { useState, useEffect, type JSX } from 'react'
import { apiRequest, endpoints } from '../lib/api'
import { TeacherManager } from '../components/admin/TeacherManager'
import { ClassManager } from '../components/admin/ClassManager'
import { ScheduleForm } from '../components/admin/ScheduleForm'
import { ScheduleList } from '../components/admin/ScheduleList'
import { BookingsManager } from '../components/admin/BookingsManager'
import { SubscriptionManager } from "../components/admin/SubscriptionManager.tsx"
import '../styles/AdminDashboard.css'
import toast from "react-hot-toast"
import {CustomerDetails} from "../components/admin/CustomerDetails.tsx";
import {FreezeManager} from "../components/admin/FreezeManager.tsx";
import {TemplateManager} from "../components/admin/TemplateManager.tsx";



interface ScheduleItem {
    id: number
    date: string
    time: string
    end_time: string
    status: string
    class_id?: number
    teacher_id?: string
    level: string
    age_category: string
    classes?: { name: string }
    teacher?: { first_name: string; last_name: string }
}

// 1. Описываем пропсы для TypeScript
interface AdminDashboardProps {
    viewMode?: 'full' | 'teacher'
}

export const AdminDashboard = ({ viewMode = 'full' }: AdminDashboardProps) => {
    const [teachers, setTeachers] = useState<any[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [allUsers, setAllUsers] = useState<any[]>([])
    const [groupedSchedule, setGroupedSchedule] = useState<Record<string, ScheduleItem[]>>({})
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);

    const [loading, setLoading] = useState(false)
    const [expanded, setExpanded] = useState<string | null>('bookings')
    const [editingId, setEditingId] = useState<number | null>(null)
    const [activeDuration, setActiveDuration] = useState(60)
    const [usersForFreeze, setUsersForFreeze] = useState<any[]>([]);

    const [newClassName, setNewClassName] = useState('')
    const [selectedUserId, setSelectedUserId] = useState('')
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')

    const [scheduleData, setScheduleData] = useState({
        class_id: '',
        teacher_id: '',
        date: '',
        time: '',
        end_time: '',
        level: 'any',
        age_category: 'any'
    })

    useEffect(() => { loadInitialData() }, [])

    const loadInitialData = async () => {
        try {
            const [resCl, resTe, resUs, resSc, resFreeze] = await Promise.all([
                apiRequest(endpoints.classes),
                apiRequest(endpoints.teachers),
                apiRequest(endpoints.allUsers),
                apiRequest(endpoints.schedule),
                apiRequest(endpoints.usersWithSubs)
            ])

            if (resCl.ok) setClasses(await resCl.json())
            if (resTe.ok) setTeachers(await resTe.json())
            if (resUs.ok) setAllUsers(await resUs.json())
            if (resFreeze.ok) setUsersForFreeze(await resFreeze.json());
            if (resSc.ok) {
                const data: ScheduleItem[] = await resSc.json()
                const grouped = data.reduce((acc: any, item: any) => {
                    if (!acc[item.date]) acc[item.date] = []
                    acc[item.date].push(item)
                    return acc
                }, {})
                setGroupedSchedule(grouped)
            }
        } catch { toast.error("Ошибка обновления данных") }
    }
    useEffect(() => {
        // 1. Проверяем, запущены ли мы внутри Telegram
        const tg = (window as any).Telegram?.WebApp;
        const user = tg?.initDataUnsafe?.user;

        if (!user || !user.id) {
            // Если зашли просто через Chrome/Safari без TG
            setIsAuthorized(false);
        } else {
            setIsAuthorized(true);
        }
    }, []);

    useEffect(() => {
        // 1. Проверяем Telegram
        const tg = (window as any).Telegram?.WebApp;
        const user = tg?.initDataUnsafe?.user;

        if (user && user.id) {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
        }
        setAuthChecking(false);

        loadInitialData();
    }, []);

    // 2. Если еще проверяем — показываем лоадер (чтобы не моргало "Доступ ограничен")
    if (authChecking) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Загрузка...</div>;
    }

    // 3. Если НЕ авторизован — показываем заглушку
    if (!isAuthorized) {
        return (
            <div style={{textAlign: 'center', padding: '50px'}}>
                <h1>🚫 Доступ ограничен</h1>
                <p>Это приложение работает только через официальный Telegram-бот школы балета.</p>
            </div>
        )
    }


    const handleSaveSchedule = async () => {
        // 1. Базовая валидация
        if (!scheduleData.class_id || !scheduleData.teacher_id || !scheduleData.date || !scheduleData.time) {
            return toast.error('Заполните обязательные поля: Класс, Тренер, Дата и Время начала');
        }

        setLoading(true);
        try {
            const url = editingId ? `${endpoints.schedule}/${editingId}` : endpoints.schedule;

            // 2. РАССЧИТЫВАЕМ END_TIME, если он пустой
            let finalEndTime = scheduleData.end_time;

            if (!finalEndTime) {
                const [hours, minutes] = scheduleData.time.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes + activeDuration); // Прибавляем длительность (60, 90 и т.д.)
                finalEndTime = date.toTimeString().slice(0, 5); // Получаем "HH:MM"
            }

            // 3. Формируем чистый объект для отправки
            const payload = {
                class_id: Number(scheduleData.class_id),
                teacher_id: scheduleData.teacher_id, // Оставляем строкой (UUID)
                date: scheduleData.date,
                time: scheduleData.time,
                end_time: finalEndTime, // Теперь тут точно не пустая строка
                level: scheduleData.level || 'any',
                age_category: scheduleData.age_category || 'any'
            };

            const res = await apiRequest(url, {
                method: editingId ? 'PUT' : 'POST',
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(editingId ? 'Обновлено' : 'Добавлено');
                setEditingId(null);
                setScheduleData({
                    class_id: '', teacher_id: '', date: '',
                    time: '', end_time: '', level: 'any', age_category: 'any'
                });
                loadInitialData();
            } else {
                const errorData = await res.json();
                toast.error(errorData.message || 'Ошибка сервера');
            }
        } catch (err) {
            toast.error('Ошибка сети');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSchedule = async (id: number) => {
        if (!window.confirm('Удалить?')) return
        const res = await apiRequest(`${endpoints.schedule}/${id}`, { method: 'DELETE' })
        if (res.ok) { toast.success('Удалено'); loadInitialData() }
    }

    const handleCancelSchedule = async (id: number) => {
        const res = await apiRequest(`${endpoints.schedule}/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled' })
        })
        if (res.ok) { toast.success('Отменено'); loadInitialData() }
    }

    const handleEditInitiate = (item: ScheduleItem) => {
        setScheduleData({
            class_id: String(item.class_id ?? ''),
            teacher_id: String(item.teacher_id ?? ''),
            date: item.date,
            time: item.time.slice(0, 5),
            end_time: item.end_time?.slice(0, 5) || '',
            level: item.level,
            age_category: item.age_category,
        })
        setEditingId(item.id)
        setExpanded('schedule')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    // AdminDashboard.tsx

    useEffect(() => {
        if (scheduleData.time) {
            const [hours, minutes] = scheduleData.time.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes + activeDuration);

            const calculatedEndTime = date.toTimeString().slice(0, 5);

            // Обновляем только если время действительно изменилось, чтобы избежать зацикливания
            if (scheduleData.end_time !== calculatedEndTime) {
                setScheduleData(prev => ({
                    ...prev,
                    end_time: calculatedEndTime
                }));
            }
        }
    }, [scheduleData.time, activeDuration]); // Следим за временем и кнопками 60/90/120

    const renderSection = (id: string, title: string, icon: string, component: JSX.Element) => (
        <section className={`admin-section ${expanded === id ? 'active' : ''}`}>
            <div className="section-header" onClick={() => setExpanded(expanded === id ? null : id)}>
                <div className="header-left">
                    <span className="section-icon">{icon}</span>
                    <h3>{title}</h3>
                </div>
                <span className={`arrow ${expanded === id ? 'up' : ''}`}>▾</span>
            </div>
            {expanded === id && (
                <div className="admin-card no-border">
                    <div className="card-content">{component}</div>
                </div>
            )}
        </section>
    )

    return (
        <div className="admin-container">
            <h1 className="admin-header">
                {viewMode === 'full' ? 'Панель управления' : 'Журнал преподавателя'}
            </h1>

            {/* Доступно всем: и Админу, и Преподавателю */}
            {renderSection('bookings', 'Журнал посещений', '👥',
                <BookingsManager
                    groupedSchedule={groupedSchedule}
                    viewMode={viewMode} // Передаем режим отображения
                />
            )}

            {/* Только для Полного Админа */}
            {viewMode === 'full' && (
                <>
                    {renderSection('schedule', editingId ? 'Редактировать занятие' : 'Добавить занятие', '📅',
                        <ScheduleForm
                            classes={classes} teachers={teachers}
                            scheduleData={scheduleData} setScheduleData={setScheduleData}
                            onCreate={handleSaveSchedule} loading={loading}
                            activeDuration={activeDuration} setActiveDuration={setActiveDuration}
                        />
                    )}

                    {renderSection('list', 'Текущее расписание', '📝',
                        <ScheduleList
                            groupedData={groupedSchedule}
                            onDelete={handleDeleteSchedule}
                            onCancel={handleCancelSchedule}
                            onEdit={handleEditInitiate}
                        />
                    )}
                    {renderSection('templates', 'Шаблоны расписания', '📋',
                        <TemplateManager
                            classes={classes}
                            teachers={teachers}
                            onUpdate={loadInitialData}
                        />
                    )}

                    {renderSection('subs', 'Выдача абонементов', '🎟️',
                        <SubscriptionManager users={allUsers} />
                    )}

                    {renderSection('teachers', 'Преподаватели', '🎓',
                        <TeacherManager
                            allUsers={allUsers} teachers={teachers}
                            selectedUserId={selectedUserId} setSelectedUserId={setSelectedUserId}
                            onMakeTeacher={async () => {
                                // Формируем URL вручную или добавь новый эндпоинт в список.
                                // Нам нужно попасть в @Patch('users/:id/teacher-status')
                                const url = `${import.meta.env.VITE_API_URL}/users/${selectedUserId}/teacher-status`;

                                const res = await apiRequest(url, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ is_teacher: true })
                                })

                                if (res.ok) {
                                    toast.success('Назначен');
                                    setSelectedUserId('');
                                    loadInitialData();
                                } else {
                                    const err = await res.json();
                                    toast.error(err.message || 'Ошибка обновления');
                                }
                            }}
                        />
                    )}

                    {renderSection('classes', 'Направления', '🩰',
                        <ClassManager
                            classes={classes} newClassName={newClassName}
                            setNewClassName={setNewClassName}
                            onAddClass={async () => {
                                const res = await apiRequest(endpoints.classes, {
                                    method: 'POST', body: JSON.stringify({ name: newClassName })
                                })
                                if (res.ok) { toast.success('Добавлено'); setNewClassName(''); loadInitialData() }
                            }}
                        />
                    )}

                    {renderSection('customers', 'Клиенты и история', '🔍',
                        <div className="admin-customers">
                            <select
                                className="admin-input"
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                            >
                                <option value="">-- Выберите ученика --</option>
                                {allUsers.map(u => (
                                    // ВАЖНО: передаем telegram_id вместо id
                                    <option key={u.id} value={u.telegram_id}>
                                        {u.first_name} {u.last_name} ({u.phone})
                                    </option>
                                ))}
                            </select>

                            <div style={{marginTop: '20px'}}>
                                <CustomerDetails userId={selectedCustomerId}/>
                            </div>
                        </div>
                    )}
                    {renderSection('freeze', 'Заморозка абонементов', '❄️',
                        <FreezeManager
                            users={usersForFreeze} // МЕНЯЕМ ЗДЕСЬ с allUsers на usersForFreeze
                            onUpdate={loadInitialData}
                        />
                    )}
                </>
            )}
        </div>
    )
}
