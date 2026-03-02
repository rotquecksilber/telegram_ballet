import { useState, useEffect } from 'react';
import { apiRequest, endpoints } from '../../lib/api';
import toast from 'react-hot-toast';

interface Props {
    classes: any[];
    teachers: any[];
    onUpdate: () => void;
}

export const TemplateManager = ({ classes, teachers, onUpdate }: Props) => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedDay, setSelectedDay] = useState(1); // 1-Пн, 7-Вс
    const [loading, setLoading] = useState(false);
    const [activeDuration, setActiveDuration] = useState(60);

    const [formData, setFormData] = useState({
        class_id: '',
        teacher_id: '',
        time: '10:00',
        end_time: '11:00',
        level: 'any',
        age_category: 'any'
    });

    const days = [
        { id: 1, name: 'Пн' }, { id: 2, name: 'Вт' }, { id: 3, name: 'Ср' },
        { id: 4, name: 'Чт' }, { id: 5, name: 'Пт' }, { id: 6, name: 'Сб' }, { id: 7, name: 'Вс' }
    ];

    // Синхронный расчет времени окончания
    useEffect(() => {
        if (formData.time) {
            const [h, m] = formData.time.split(':').map(Number);
            const date = new Date();
            date.setHours(h, m + activeDuration);
            setFormData(prev => ({ ...prev, end_time: date.toTimeString().slice(0, 5) }));
        }
    }, [formData.time, activeDuration]);

    useEffect(() => { loadTemplates(); }, []);

    const loadTemplates = async () => {
        try {
            const res = await apiRequest(endpoints.templates);
            if (res.ok) setTemplates(await res.json());
        } catch (e) { toast.error("Ошибка загрузки шаблонов"); }
    };

    const handleAdd = async () => {
        if (!formData.class_id || !formData.teacher_id) return toast.error("Заполните все поля");
        setLoading(true);
        try {
            const res = await apiRequest(endpoints.templates, {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    day_of_week: selectedDay,
                    teacher_id: Number(formData.teacher_id) // Принудительно в число для BIGINT
                })
            });
            if (res.ok) {
                toast.success("Шаблон добавлен");
                loadTemplates();
            }
        } finally { setLoading(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Удалить этот шаблон?")) return;
        const res = await apiRequest(endpoints.templateById(id), { method: 'DELETE' });
        if (res.ok) {
            toast.success("Удалено");
            setTemplates(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleDeploy = async () => {
        const dateStr = prompt("На какую дату опубликовать эту сетку?", new Date().toISOString().split('T')[0]);
        if (!dateStr) return;
        setLoading(true);
        try {
            const res = await apiRequest(endpoints.deploySchedule, {
                method: 'POST',
                body: JSON.stringify({ day_of_week: selectedDay, date: dateStr })
            });
            if (res.ok) {
                toast.success("Расписание успешно создано!");
                onUpdate(); // Обновляем основной календарь админки
            }
        } finally { setLoading(false); }
    };

    return (
        <div className="admin-form-inside">
            {/* Выбор дня недели */}
            <div className="segmented-control mb-16">
                {days.map(day => (
                    <button
                        key={day.id}
                        className={`segment-btn ${selectedDay === day.id ? 'active' : ''}`}
                        onClick={() => setSelectedDay(day.id)}
                    >{day.name}</button>
                ))}
            </div>

            {/* Форма добавления (стиль как у создания занятия) */}
            <div className="admin-card mb-16" style={{padding: '12px', border: '1px solid var(--tg-theme-secondary-bg-color)'}}>
                <div className="field">
                    <label className="field-label-mini">Направление</label>
                    <select value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})}>
                        <option value="">Выберите класс</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="field">
                    <label className="field-label-mini">Преподаватель</label>
                    <select value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})}>
                        <option value="">Выберите учителя</option>
                        {teachers.map(t => <option key={t.id} value={t.telegram_id}>{t.last_name} {t.first_name}</option>)}
                    </select>
                </div>


                <div className="form-row-grid">

                    <div className="field">
                        <label className="field-label-mini">Уровень</label>
                        <select
                            value={formData.level}
                            onChange={e => setFormData({...formData, level: e.target.value})}
                        >
                            <option value="any">Любой</option>
                            <option value="beginners">Новички</option>
                            <option value="advanced">Профи</option>
                        </select>
                    </div>
                    <div className="field">
                        <label className="field-label-mini">Возраст</label>
                        <select
                            value={formData.age_category}
                            onChange={e => setFormData({...formData, age_category: e.target.value})}
                        >
                            <option value="any">Любой</option>
                            <option value="children">Дети</option>
                            <option value="adults">Взрослые</option>
                        </select>
                    </div>
                </div>

                <div className="form-row-grid mt-8">

                    <div className="field">
                        <label className="field-label-mini">Время начала</label>
                        <input
                            type="time"
                            value={formData.time}
                            onChange={e => setFormData({...formData, time: e.target.value})}
                        />
                    </div>
                    <div className="field">
                        <label className="field-label-mini">Длительность</label>
                        <div className="duration-tabs-segmented">
                            {[60, 90, 120].map(dur => (
                                <button
                                    key={dur}
                                    type="button"
                                    className={`duration-segment ${activeDuration === dur ? 'active' : ''}`}
                                    onClick={() => setActiveDuration(dur)}
                                >
                                    {dur === 60 ? '1 ч' : dur === 90 ? '1.5 ч' : '2 ч'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="end-time-hint mt-8">✨ Закончится в <b>{formData.end_time}</b></div>


                <button className="confirm-btn mt-12" onClick={handleAdd} disabled={loading}>
                    {loading ? '...' : '+ Добавить в шаблон'}
                </button>
            </div>

            {/* Список созданных шаблонов на выбранный день */}
            <div className="templates-list">
                <div className="tg-section-label">Сетка на {days.find(d => d.id === selectedDay)?.name}</div>
                {templates.filter(t => t.day_of_week === selectedDay).map(t => (
                    <div key={t.id} className="tg-sub-row">
                        <div className="sub-info-block">
                            <span className="tg-text-main">{t.classes?.name}</span>
                            <span className="tg-text-hint">
                                {t.time?.slice(0,5)} - {t.end_time?.slice(0,5)} | {t.users?.last_name}
                            </span>
                        </div>
                        <button className="btn-delete-icon" onClick={() => handleDelete(t.id)}>🗑️</button>
                    </div>
                ))}
                {templates.filter(t => t.day_of_week === selectedDay).length === 0 && (
                    <div className="tg-empty-hint">Пусто. Добавьте первое занятие выше.</div>
                )}
            </div>

            {/* Кнопка публикации */}
            {templates.filter(t => t.day_of_week === selectedDay).length > 0 && (
                <button className="confirm-btn mt-16" style={{background: '#31b545'}} onClick={handleDeploy} disabled={loading}>
                    🚀 Опубликовать {days.find(d => d.id === selectedDay)?.name} целиком
                </button>
            )}
        </div>
    );
};
