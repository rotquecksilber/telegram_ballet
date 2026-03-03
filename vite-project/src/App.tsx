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

            // Если зашли не через Telegram
            if (!tgUser) {
                setLoading(false)
                return
            }

            // 1. Оптимистичная установка данных (сразу даем права админа для теста)
            const baseUserData = {
                id: tgUser.id,
                firstName: tgUser.first_name,
                username: tgUser.username,
                isAdmin: true,
                isTeacher: true,
            }
            setUser(baseUserData)

            try {
                // 2. Фоновый запрос к бэкенду
                const response = await apiRequest(endpoints.init(tgUser.id))

                if (response.ok) {
                    const data = await response.json()
                    // Обновляем стор данными из БД, если они пришли
                    setUser({
                        ...baseUserData,
                        fullName: data.user ? `${data.user.first_name} ${data.user.last_name}` : undefined,
                        phone: data.user?.phone,
                        isTeacher: data.user?.is_teacher ?? true,
                    })
                } else {
                    // Сервер ответил, но с ошибкой (например, 500)
                    console.error("Ошибка сервера:", response.status)
                    toast.error("Не удалось обновить профиль", { id: 'api-error' })
                }
            } catch (err: any) {
                // Ошибка сети / CORS / SSL
                console.warn("API недоступно, работаем автономно")
                toast.error("Проблемы со связью. Данные могут быть устаревшими", {
                    id: 'network-error',
                    icon: '📡'
                })
            } finally {
                // В любом случае выключаем лоадер через небольшую паузу для плавности
                setTimeout(() => setLoading(false), 400)
            }
        }

        initApp()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) {
        return (
            <div className="loader-container">
                <div className="spinner"></div>
                <div className="loader-text">Загрузка студии...</div>
            </div>
        )
    }

    const renderContent = () => {
        // Защита на случай, если tgUser не определен (вне Telegram)
        if (!user && !loading) {
            return (
                <div className="empty-state">
                    <p>Пожалуйста, откройте приложение через Telegram бота</p>
                </div>
            )
        }

        switch (activeTab) {
            case 'schedule':
                return <Schedule />
            case 'profile':
                return <Profile onRegisterSuccess={() => {}} />
            case 'admin':
                return <AdminDashboard viewMode="full" />
            default:
                return <Schedule />
        }
    }

    return (
        <div className="app-container">
            {/* Контейнер для всплывающих уведомлений */}
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    style: { background: '#333', color: '#fff' }
                }}
            />

            <main className="main-content">
                {renderContent()}
            </main>

            <BottomNav
                active={activeTab}
                onChange={setActiveTab}
                isAdmin={user?.isAdmin || true}
                isTeacher={user?.isTeacher || true}
            />
        </div>
    )
}

export default App
