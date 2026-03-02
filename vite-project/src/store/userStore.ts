import { create } from 'zustand'

export interface User {
    id: number           // Telegram ID
    firstName: string    // Имя из Telegram (для отображения в приветствии)
    username?: string    // @username
    fullName?: string    // ФИО из базы (если есть, значит регистрация пройдена)
    phone?: string       // Телефон из базы
    isAdmin: boolean
    isTeacher: boolean
}

interface UserState {
    user: User | null
    setUser: (user: User | null) => void
    isRegistered: () => boolean
}

export const useUserStore = create<UserState>((set, get) => ({
    user: null,
    setUser: (user) => set({ user }),
    // Геттер вернет true, только если объект юзера существует и fullName заполнен
    isRegistered: () => {
        const user = get().user;
        return !!(user && user.fullName);
    },
}))
