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

    const formatTime = (time: string) => time ? time.slice(0, 5) : '';

    // Получаем массив ближайших 3 дней из groupedData
    const getRecentAndFutureDays = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);

        return Object.entries(groupedData).filter(([date]) => {
            const lessonDate = new Date(date);
            lessonDate.setHours(0, 0, 0, 0);

            return lessonDate >= threeDaysAgo; // последние 3 дня + будущее
        });
    };

    const filteredData = getRecentAndFutureDays();

    return (
        <div className="admin-schedule-list">
            {filteredData.length === 0 && <div>На ближайшие 3 дня занятий нет</div>}

            {filteredData.map(([date, items]) => (
                <div key={date} className="admin-date-group">
                    <h4 className="admin-date-label">{formatDate(date)}</h4>

                    {items.map((item) => {
                        const isCancelled = item.status === 'cancelled';

                        return (
                            <div key={item.id} className={`admin-item-card ${isCancelled ? 'is-cancelled' : ''}`}>
                                <div className="admin-item-main">
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
