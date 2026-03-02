import '../../styles/AdminDashboard.css'

interface Props {
    groupedData: Record<string, any[]>
    onDelete: (id: number) => void
    onCancel: (id: number) => void
    onEdit: (item: any) => void
}

export const ScheduleList = ({ groupedData, onDelete, onCancel, onEdit }: Props) => {

    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat('ru-RU', {
                day: 'numeric',
                month: 'long'
            }).format(new Date(dateStr));
        } catch (e) { return dateStr; }
    };

    // Хелпер для обрезки времени HH:mm:ss -> HH:mm
    const formatTime = (time: string) => time ? time.slice(0, 5) : '';

    return (
        <div className="admin-schedule-list">
            {Object.entries(groupedData).map(([date, items]) => (
                <div key={date} className="admin-date-group">
                    <h4 className="admin-date-label">{formatDate(date)}</h4>

                    {items.map((item) => {
                        const isCancelled = item.status === 'cancelled';

                        return (
                            <div key={item.id} className={`admin-item-card ${isCancelled ? 'is-cancelled' : ''}`}>
                                <div className="admin-item-main">
                                    {/* БЛОК ВРЕМЕНИ С ОКОНЧАНИЕМ */}
                                    <div className="admin-item-time-wrapper">
                                        <span className="admin-item-time">{formatTime(item.time)}</span>
                                        {item.end_time && (
                                            <span className="admin-item-endtime">
                                                {formatTime(item.end_time)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="admin-item-text">
                                        <strong className="class-name" style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
                                            {item.classes?.name}
                                        </strong>
                                        <span className="teacher-name">
                                            {item.teacher?.first_name} {item.teacher?.last_name}
                                        </span>
                                        {isCancelled && <span className="badge-cancelled">ОТМЕНЕНО</span>}
                                    </div>
                                </div>

                                <div className="admin-item-actions">
                                    <button className="btn-icon edit" onClick={() => onEdit(item)}>✏️</button>
                                    {!isCancelled && (
                                        <button className="btn-icon cancel" onClick={() => onCancel(item.id)}>🚫</button>
                                    )}
                                    <button className="btn-icon delete" onClick={() => onDelete(item.id)}>🗑️</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
