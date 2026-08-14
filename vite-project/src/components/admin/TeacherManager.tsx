import { useMemo, useState, useEffect } from 'react'
import '../../styles/AdminDashboard.css'

interface Props {
    allUsers: any[]
    teachers: any[]
    selectedUserId: string
    setSelectedUserId: (id: string) => void
    onMakeTeacher: () => void
}

export const TeacherManager = ({ allUsers, teachers, selectedUserId, setSelectedUserId, onMakeTeacher }: Props) => {
    const [search, setSearch] = useState('')

    const candidates = useMemo(() => allUsers.filter(u => !u.is_teacher), [allUsers])
    const selectedUser = useMemo(
        () => candidates.find(u => String(u.id) === String(selectedUserId)) || null,
        [candidates, selectedUserId]
    )

    const filteredUsers = useMemo(() => {
        if (!search) return []
        return candidates
            .filter(u => `${u.last_name || ''} ${u.first_name || ''} ${u.username || ''}`.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''))
            .slice(0, 10)
    }, [candidates, search])

    // Если выбор сбросили снаружи (например, после успешного назначения), чистим поиск
    useEffect(() => {
        if (!selectedUserId) setSearch('')
    }, [selectedUserId])

    return (
        <div className="admin-card teacher-border">
            {!selectedUser ? (
                <div className="user-selector" style={{ display: 'flex', flexDirection: 'column' }}>
                    <input
                        type="text"
                        placeholder="Поиск ученика по фамилии или имени..."
                        className="admin-search-input"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    {search && (
                        <div className="user-list-mini" style={{
                            height: 'auto',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            marginTop: '8px',
                            border: '1px solid var(--tg-theme-hint-color)',
                            borderRadius: '8px',
                            background: 'var(--tg-theme-secondary-bg-color)'
                        }}>
                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                <div
                                    key={u.id}
                                    className="user-row"
                                    style={{ padding: '12px', borderBottom: '1px solid var(--tg-theme-hint-color)', cursor: 'pointer' }}
                                    onClick={() => setSelectedUserId(String(u.id))}
                                >
                                    <div style={{ fontWeight: 600, color: 'var(--tg-theme-text-color)' }}>
                                        {u.first_name} {u.last_name || `(@${u.username})`}
                                    </div>
                                </div>
                            )) : (
                                <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                                    Никто не найден
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="input-group">
                    <div className="selected-user-badge" style={{ background: 'var(--tg-theme-secondary-bg-color)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', flex: 1 }}>
                        <span>Ученик: <b>{selectedUser.first_name} {selectedUser.last_name}</b></span>
                        <button className="btn-text" onClick={() => { setSelectedUserId(''); setSearch('') }}>Изменить</button>
                    </div>
                    <button className="action-btn" onClick={onMakeTeacher}>OK</button>
                </div>
            )}

            <div className="divider"/>
            <div className="tags-grid">
                {teachers.map(t => <span key={t.id} className="teacher-chip">{t.first_name} {t.last_name}</span>)}
            </div>
        </div>
    )
}
