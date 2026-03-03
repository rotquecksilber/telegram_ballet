// lib/api.ts

const API_URL = import.meta.env.VITE_API_URL;

export const endpoints = {
    // Пользователи
    init: (id: number) => `${API_URL}/users/init?id=${id}`,
    register: `${API_URL}/users/register`,
    allUsers: `${API_URL}/users/all`,
    teachers: `${API_URL}/users/teachers`,
    usersWithSubs: `${API_URL}/users/with-subscriptions`,

    // Абонементы
    subscriptions: `${API_URL}/subscriptions`,
    userSubscription: (telegram_id: string | number) =>
        `${API_URL}/subscriptions/user/${telegram_id}`,
    freezeSubscription: (id: string | number) =>
        `${API_URL}/subscriptions/${id}/freeze`,

    // Расписание и Шаблоны
    classes: `${API_URL}/classes`,
    schedule: `${API_URL}/schedule`,
    templates: `${API_URL}/schedule-templates`,
    templateById: (id: number | string) => `${API_URL}/schedule-templates/${id}`,
    deploySchedule: `${API_URL}/schedule/deploy`,

    // Бронирования
    bookings: `${API_URL}/bookings`,
    userBookings: (userId: string | number) =>
        `${API_URL}/bookings/user/${userId}`,
    userBookingsByTg: (tgId: string | number) =>
        `${API_URL}/bookings/user/${tgId}`,

    // Уведомления
    telegram: `${API_URL}/telegram/send`,
};

/**
 * Универсальная обертка для запросов к API.
 * Автоматически добавляет ID пользователя из Telegram в заголовки.
 */
export const apiRequest = async (url: string, options: RequestInit = {}) => {
    // Достаем данные из Telegram WebApp SDK
    const tg = (window as any).Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;

    // Базовые заголовки
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Bypass-Tunnel-Reminder": "true", // Для LocalTunnel
        "ngrok-skip-browser-warning": "true", // Для Ngrok
    };

    // Если приложение запущено в Telegram, добавляем ID в заголовок для Guard на бэкенде
    if (user?.id) {
        headers["x-telegram-id"] = user.id.toString();
    }

    // Для отладки в консоли
    console.log(`[🚀 API] ${options.method || 'GET'} -> ${url}`);
    if (!user?.id) {
        console.warn("[⚠️ API] Запрос без x-telegram-id (вне Telegram или SDK не инициализирован)");
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers, // Позволяет переопределять заголовки в конкретном вызове
            },
        });

        // Если бэкенд вернул 403, значит сработал Guard
        if (response.status === 403) {
            console.error("🚫 Доступ запрещен бэкендом (ошибка Guard)");
        }

        return response;
    } catch (error) {
        console.error("[❌ API Error]:", error);
        throw error;
    }
};
