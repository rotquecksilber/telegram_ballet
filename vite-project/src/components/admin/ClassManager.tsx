import '../../styles/AdminDashboard.css'
interface Props {
    classes: any[]
    newClassName: string
    setNewClassName: (name: string) => void
    onAddClass: () => void
}

export const ClassManager = ({ classes, newClassName, setNewClassName, onAddClass }: Props) => (
    <div className="admin-card class-border">
        <div className="input-group">
            <input
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                placeholder="Название (например, Поул-денс)"
            />
            <button className="action-btn" onClick={onAddClass}>+</button>
        </div>
        <div className="divider" />
        <div className="tags-grid">
            {classes.map(c => <span key={c.id} className="modern-tag">{c.name}</span>)}
        </div>
    </div>
)
