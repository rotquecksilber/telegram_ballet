import './../styles/BottomNav.css'

interface BottomNavProps {
    active: 'schedule' | 'profile' | 'admin' | 'teacher'
    onChange: (tab: any) => void
    isAdmin?: boolean
    isTeacher?: boolean
}

export const BottomNav = ({ active, onChange, isAdmin, isTeacher }: BottomNavProps) => {
    // Если не админ и не тренер — кнопку не рисуем
    if (!isAdmin && !isTeacher) {
        return (
            <nav className="bottom-nav two-items">
                <button className={`nav-button ${active === 'schedule' ? 'active' : ''}`} onClick={() => onChange('schedule')}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                    <span>Расписание</span>
                </button>
                <button className={`nav-button ${active === 'profile' ? 'active' : ''}`} onClick={() => onChange('profile')}>
                    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <span>Профиль</span>
                </button>
            </nav>
        )
    }

    return (
        <nav className="bottom-nav">
            <button className={`nav-button ${active === 'schedule' ? 'active' : ''}`} onClick={() => onChange('schedule')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                <span>Расписание</span>
            </button>

            <button className={`nav-button ${active === 'profile' ? 'active' : ''}`} onClick={() => onChange('profile')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                <span>Профиль</span>
            </button>

            {/* Динамическая кнопка: Админ или Тренер */}
            <button
                className={`nav-button ${active === 'admin' ? 'active' : ''}`}
                onClick={() => onChange('admin')}
            >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isAdmin ? (
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    ) : (
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 14h-2a3 3 0 0 1-3-3V7a3 3 0 0 1 6 0v11a3 3 0 0 1-3 3z" />
                    )}
                </svg>
                <span>{isAdmin ? 'Админ' : 'Журнал'}</span>
            </button>
        </nav>
    )
}
