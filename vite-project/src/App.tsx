import './App.css'
import { useEffect, useState } from 'react'
import { useUserStore } from './store/userStore'
import { apiRequest, endpoints } from './lib/api'
import { BottomNav } from './components/BottomNav'
import { Profile } from './pages/Profile'
import { AdminDashboard } from './pages/AdminDashboard'
import { Schedule } from './pages/Schedule'
import toast, { Toaster } from 'react-hot-toast'

function App() {
    const [activeTab, setActiveTab] = useState<'schedule' | 'profile' | 'admin'>('schedule')
    const [loading, setLoading] = useState(true)
    const { user, setUser } = useUserStore()

    useEffect(() => {
        const initApp = async () => {
            const tg = (window as any).Telegram?.WebApp
            const tgUser = tg?.initDataUnsafe?.user

            if (tg) {
                tg.ready()
                tg.expand()
                tg.setHeaderColor(tg.backgroundColor)
            }

            if (!tgUser) {
                setLoading(false)
                return
            }

            // 1. Инициализируем пользователя базовыми данными (права по умолчанию false)
            const initialData = {
                id: tgUser.id,
                firstName: tgUser.first_name,
                username: tgUser.username,
                isAdmin: false,
                isTeacher: false,
            }
            setUser(initialData)

            try {
                // 2. Запрашиваем реальные роли и данные с сервера
                const response = await apiRequest(endpoints.init(tgUser.id))

                if (response.ok) {
                    const data = await response.json()

                    // Обновляем стор только теми правами, которые подтвердил сервер
                    setUser({
                        ...initialData,
                        fullName: data.user ? `${data.user.first_name} ${data.user.last_name}` : undefined,
                        phone: data.user?.phone,
                        isAdmin: !!data.isAdmin,
                        isTeacher: !!data.user?.is_teacher,
                    })
                } else {
                    toast.error("Ошибка авторизации. Доступ ограничен.", { id: 'auth-error' })
                }
            } catch (err: any) {
                console.error("Ошибка связи с сервером:", err)
                toast.error("Сервер недоступен. Проверьте соединение.", { id: 'net-error' })
            } finally {
                setLoading(false)
            }
        }

        initApp()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) {
        return (
            <div className="loader-container">
                <div className="spinner"></div>
                <div className="loader-text">Загрузка...</div>
            </div>
        )
    }

    const renderContent = () => {
        if (!user) return <div className="empty-state">Пожалуйста, используйте Telegram</div>

        switch (activeTab) {
            case 'schedule':
                return <Schedule />
            case 'profile':
                return <Profile onRegisterSuccess={() => {}} />
            case 'admin':
                // Строгая проверка прав перед рендером админки
                if (user.isAdmin) {
                    return <AdminDashboard viewMode="full" />
                } else if (user.isTeacher) {
                    return <AdminDashboard viewMode="teacher" />
                } else {
                    return <div className="empty-state">Доступ запрещен</div>
                }
            default:
                return <Schedule />
        }
    }

    return (
        <div className="app-container">
            <Toaster position="top-center" />

            <main className="main-content">
                {renderContent()}
            </main>

            <BottomNav
                active={activeTab}
                onChange={setActiveTab}
                isAdmin={user?.isAdmin}
                isTeacher={user?.isTeacher}
            />
        </div>
    )
}

export default App
