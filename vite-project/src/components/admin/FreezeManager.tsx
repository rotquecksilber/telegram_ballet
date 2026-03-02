import { useMemo } from 'react';
import { apiRequest, endpoints } from '../../lib/api';
import toast from 'react-hot-toast';

interface Props {
    users: any[];
    onUpdate: () => void;
}

export const FreezeManager = ({ users, onUpdate }: Props) => {

    // 1. Фильтруем пользователей, у которых есть подписки с лимитом заморозки
    const usersWithFreeze = useMemo(() => {
        return users.filter(u =>
            u.subscriptions?.some((s: any) => Number(s.freeze_limit_days) > 0)
        );
    }, [users]);

    // Расчет дней текущей заморозки
    const getDaysCounter = (startDate: string) => {
        const diff = Math.abs(new Date().getTime() - new Date(startDate).getTime());
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const handleAction = async (sub: any) => {
        const action = sub.is_frozen ? 'разморозить' : 'заморозить';

        // Виброотклик для Telegram
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred(sub.is_frozen ? 'success' : 'warning');
        }

        if (!confirm(`Вы уверены, что хотите ${action} абонемент?`)) return;

        try {
            const res = await apiRequest(endpoints.freezeSubscription(sub.id), {
                method: 'PATCH',
                body: JSON.stringify({ is_frozen: !sub.is_frozen })
            });

            if (res.ok) {
                toast.success(sub.is_frozen ? 'Ученик вернулся!' : 'Абонемент на паузе');
                onUpdate();
            }
        } catch (e) {
            toast.error('Ошибка связи с сервером');
        }
    };

    // Разделяем на группы
    const frozen = usersWithFreeze.filter(u => u.subscriptions.some((s: any) => s.is_frozen));
    const active = usersWithFreeze.filter(u => !u.subscriptions.some((s: any) => s.is_frozen));

    const renderCard = (user: any) => (
        <div key={user.id} className="tg-user-card">
            <div className="tg-card-header">
                <span className="tg-text-main">{user.last_name} {user.first_name}</span>
                <span className="tg-text-hint">{user.phone || 'Нет номера'}</span>
            </div>
            {user.subscriptions
                .filter((s: any) => Number(s.freeze_limit_days) > 0)
                .map((sub: any) => (
                    <div key={sub.id} className={`tg-sub-row ${sub.is_frozen ? 'is-frozen' : ''}`}>
                        <div className="sub-info-block">
                            <div className="sub-top-line">
                            <span className="tg-text-main" style={{fontSize: '14px'}}>
                                {sub.remaining_lessons} зан.
                            </span>
                                <span className="tg-freeze-badge">
                                {sub.freeze_days_used || 0}/{sub.freeze_limit_days} дн.
                            </span>
                            </div>
                            <span className="tg-text-hint" style={{fontSize: '11px'}}>
                            {sub.is_frozen
                                ? `❄️ С ${new Date(sub.freeze_start_date).toLocaleDateString()} (${getDaysCounter(sub.freeze_start_date)} дн.)`
                                : `Активен до ${new Date(sub.expiry_date).toLocaleDateString()}`
                            }
                        </span>
                        </div>
                        <button
                            onClick={() => handleAction(sub)}
                            className={`tg-action-button ${sub.is_frozen ? 'unfreeze' : 'freeze'}`}
                        >
                            {sub.is_frozen ? '▶️' : '❄️'}
                        </button>
                    </div>
                ))}
        </div>
    );

    return (
        <div className="freeze-manager-tg">
            {frozen.length > 0 && (
                <>
                    <div className="tg-section-label">❄️ СЕЙЧАС НА ПАУЗЕ</div>
                    {frozen.map(renderCard)}
                </>
            )}

            <div className="tg-section-label">👥 МОЖНО ЗАМОРОЗИТЬ</div>
            {active.length > 0 ? active.map(renderCard) : (
                <div className="tg-empty-hint">Нет доступных абонементов</div>
            )}
        </div>
    );
};
