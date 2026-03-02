
import '../../styles/AdminDashboard.css'

interface Props {
    allUsers: any[]
    teachers: any[]
    selectedUserId: string
    setSelectedUserId: (id: string) => void
    onMakeTeacher: () => void
}

export const TeacherManager = ({ allUsers, teachers, selectedUserId, setSelectedUserId, onMakeTeacher }: Props) => (
    <div className="admin-card teacher-border">
        <div className="input-group">
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                <option value="">Выбрать ученика...</option>
                {allUsers.filter(u => !u.is_teacher).map(u => (
                    <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name || `(@${u.username})`}
                    </option>
                ))}
            </select>
            <button className="action-btn" onClick={onMakeTeacher}>OK</button>
        </div>
        <div className="divider"/>
        <div className="tags-grid">
            {teachers.map(t => <span key={t.id} className="teacher-chip">{t.first_name} {t.last_name}</span>)}
        </div>
    </div>
)
