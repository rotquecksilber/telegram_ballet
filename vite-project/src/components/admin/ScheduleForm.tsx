import '../../styles/AdminDashboard.css'

interface Props {
    classes: any[]
    teachers: any[]
    scheduleData: any
    setScheduleData: (data: any) => void
    onCreate: () => void
    loading: boolean
    activeDuration: number
    setActiveDuration: (dur: number) => void
}

export const ScheduleForm = ({
                                 classes, teachers, scheduleData, setScheduleData,
                                 onCreate, loading, activeDuration, setActiveDuration
                             }: Props) => (

    <div className="admin-form-inside">
        <div className="field">
            <label className="field-label-mini">Направление</label>
            <select
                value={scheduleData.class_id}
                onChange={e => setScheduleData({...scheduleData, class_id: e.target.value})}
            >
                <option value="">Выберите класс</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>

        <div className="field">
            <label className="field-label-mini">Преподаватель</label>
            <select
                value={scheduleData.teacher_id}
                onChange={e => setScheduleData({...scheduleData, teacher_id: e.target.value})}
            >
                <option value="">Выберите учителя</option>
                {teachers.map(t => (
                    <option key={t.id} value={String(t.telegram_id)}>
                        {t.first_name} {t.last_name}
                    </option>
                ))}
            </select>
        </div>

        <div className="form-row-grid">
            <div className="field">
                <label className="field-label-mini">Дата</label>
                <input type="date" value={scheduleData.date}
                       onChange={e => setScheduleData({...scheduleData, date: e.target.value})}/>
            </div>
            <div className="field">
                <label className="field-label-mini">Время</label>
                <input type="time" value={scheduleData.time}
                       onChange={e => setScheduleData({...scheduleData, time: e.target.value})}/>
            </div>
        </div>

        <div className="form-row-grid">
            <div className="field">
                <label className="field-label-mini">Уровень</label>
                <select value={scheduleData.level}
                        onChange={e => setScheduleData({...scheduleData, level: e.target.value})}>
                    <option value="any">Любой</option>
                    <option value="beginners">Новички</option>
                    <option value="advanced">Профи</option>
                </select>
            </div>
            <div className="field">
                <label className="field-label-mini">Возраст</label>
                <select value={scheduleData.age_category}
                        onChange={e => setScheduleData({...scheduleData, age_category: e.target.value})}>
                    <option value="any">Любой</option>
                    <option value="children">Дети</option>
                    <option value="adults">Взрослые</option>
                </select>
            </div>
        </div>

        <div className="duration-picker-inline">
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
            {scheduleData.time && (
                <div className="end-time-hint">
                    ✨ Закончится в <b>{scheduleData.end_time}</b>
                </div>
            )}
        </div>

        <button className="confirm-btn" onClick={onCreate} disabled={loading}>
            {loading ? 'Сохранение...' : 'Опубликовать занятие'}
        </button>
    </div>
)
