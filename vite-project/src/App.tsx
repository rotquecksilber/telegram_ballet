import './App.css'
import { useEffect, useState } from 'react'
import { useUserStore } from './store/userStore'
import { apiRequest, endpoints } from './lib/api'
import { BottomNav } from './components/BottomNav'
import { Profile } from './pages/Profile'
import { AdminDashboard } from './pages/AdminDashboard'
import { Schedule } from './pages/Schedule'
import toast from 'react-hot-toast'

function App() {
    const [activeTab, setActiveTab] = useState<'schedule' | 'profile' | 'admin'>('schedule')
    const [loading, setLoading] = useState(true)
    const { user, setUser } = useUserStore()

    useEffect(() => {
        const initApp = async () => {
            const tg = (window as any).Telegram?.WebApp

            // Данные для разработки (или из TG)
            const tgUser = tg?.initDataUnsafe?.user || {
                id: 419396137,
                first_name: 'Dev',
                username: 'test_user'
            }

            if (tg) {
                tg.ready()
                tg.expand()
                tg.setHeaderColor(tg.backgroundColor)
            }

            try {
                // Инициализация пользователя через бэкенд
                const response = await apiRequest(endpoints.init(tgUser.id))

                if (!response.ok) {
                    throw new Error(`Ошибка сервера: ${response.status}`)
                }

                const data = await response.json()

                // Сохраняем расширенные данные (админ + тренер)
                setUser({
                    id: tgUser.id,
                    firstName: tgUser.first_name,
                    username: tgUser.username,
                    fullName: data.user ? `${data.user.first_name} ${data.user.last_name}` : undefined,
                    phone: data.user?.phone,
                    isAdmin: data.isAdmin,
                    isTeacher: data.user?.is_teacher || false, // Важно для разделения ролей
                })

            } catch (err: any) {
                console.error("Критическая ошибка инициализации:", err)
                toast.error("Не удалось подключиться к серверу")
            } finally {
                setTimeout(() => setLoading(false), 600)
            }
        }

        initApp()
    }, [setUser])

    if (loading) {
        return (
            <div className="loader-container">
                <div className="spinner"></div>
                <div className="loader-text">Студия загружается...</div>
            </div>
        )
    }

    const isRegistered = !!user?.fullName

    // Если не зарегистрирован — только профиль для ввода данных
    if (!isRegistered) {
        return (
            <div className="app-container">
                <main className="main-content">
                    <Profile onRegisterSuccess={() => {}} />
                </main>
            </div>
        )
    }


    // Рендер контента по вкладкам
    const renderContent = () => {
        switch (activeTab) {
            case 'schedule':
                return <Schedule />
            case 'profile':
                return <Profile onRegisterSuccess={() => {}} />
            case 'admin':
                // ПРОВЕРКА РОЛЕЙ:
                // Если админ — полная панель
                // Если не админ, но тренер — только журнал
                if (user?.isAdmin) {
                    return <AdminDashboard viewMode="full" />
                } else if (user?.isTeacher) {
                    return <AdminDashboard viewMode="teacher" />
                } else {
                    return <div className="empty-state">У вас нет прав доступа к этому разделу</div>
                }
            default:
                return <Schedule />
        }
    }

    return (
        <div className="app-container">
            <main className="main-content">
                {renderContent()}
            </main>

            {/* Пробрасываем оба флага, чтобы BottomNav знал, какую иконку рисовать */}
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
