import { useMemo } from 'react'
import { apiRequest, endpoints } from '../../lib/api'
import toast from 'react-hot-toast'

interface Props {
    groupedData: Record<string, any[]>
    onUpdate: () => void
}

export const RegistrationManager = ({ groupedData, onUpdate }: Props) => {

    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(dateStr));
        } catch (e) { return dateStr; }
    };

    const formatTime = (time: string) => time ? time.slice(0, 5) : '';

    // Показываем только будущие и не отменённые занятия
    const upcomingEntries = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return Object.entries(groupedData)
            .filter(([date]) => new Date(date) >= today)
            .map(([date, items]) => [date, items.filter((i: any) => i.status !== 'cancelled')] as [string, any[]])
            .filter(([, items]) => items.length > 0);
    }, [groupedData]);

    const handleToggle = async (id: number, closed: boolean) => {
        const res = await apiRequest(`${endpoints.schedule}/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: closed ? 'closed' : 'active' })
        })
        if (res.ok) {
            toast.success(closed ? 'Запись закрыта' : 'Запись снова открыта')
            onUpdate()
        } else {
            toast.error('Ошибка сервера')
        }
    }

    return (
        <div className="admin-schedule-list">
            {upcomingEntries.length === 0 && <div>На ближайшее время занятий нет</div>}

            {upcomingEntries.map(([date, items]) => (
                <div key={date} className="admin-date-group">
                    <h4 className="admin-date-label">{formatDate(date)}</h4>

                    {items.map((item) => {
                        const isClosed = item.status === 'closed';

                        return (
                            <div key={item.id} className="admin-item-card">
                                <div className="admin-item-main">
                                    <div className="admin-item-time-wrapper">
                                        <span className="admin-item-time">{formatTime(item.time)}</span>
                                        {item.end_time && (
                                            <span className="admin-item-endtime">{formatTime(item.end_time)}</span>
                                        )}
                                    </div>

                                    <div className="admin-item-text">
                                        <strong className="class-name">{item.classes?.name}</strong>
                                        <span className="teacher-name">
                                            {item.teacher?.first_name} {item.teacher?.last_name}
                                        </span>
                                        {isClosed && <span className="badge-cancelled">ЗАПИСЬ ЗАКРЫТА</span>}
                                    </div>
                                </div>

                                <div className="admin-item-actions">
                                    <button
                                        className="btn-icon close-reg"
                                        onClick={() => handleToggle(item.id, !isClosed)}
                                    >
                                        {isClosed ? '🔓 Открыть запись' : '🔒 Закрыть запись'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}
