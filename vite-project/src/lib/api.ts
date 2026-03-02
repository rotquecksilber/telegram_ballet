const API_URL = import.meta.env.VITE_API_URL;

export const endpoints = {
    init: (id: number) => `${API_URL}/users/init?id=${id}`,
    register: `${API_URL}/users/register`,
    allUsers: `${API_URL}/users/all`,
    teachers: `${API_URL}/users/teachers`,

    // Subscriptions

    subscriptions: `${API_URL}/subscriptions`,
    templates: `${API_URL}/schedule-templates`,
    deploySchedule: `${API_URL}/schedule/deploy`,
telegram: `${API_URL}/telegram/send`,

    templateById: (id: number | string) => `${API_URL}/schedule-templates/${id}`,

    classes: `${API_URL}/classes`,
    schedule: `${API_URL}/schedule`,
    bookings: `${API_URL}/bookings`,
    userSubscription: (telegram_id: string | number) =>
        `${API_URL}/subscriptions/user/${telegram_id}`,

    userBookings: (userId: string | number) =>
        `${API_URL}/bookings/user/${userId}`,

    freezeSubscription: (id: string | number) =>
        `${API_URL}/subscriptions/${id}/freeze`,

    userBookingsByTg: (tgId: string | number) =>
        `${API_URL}/bookings/user/${tgId}`,
    usersWithSubs: `${API_URL}/users/with-subscriptions`,
};

export const apiRequest = async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true",
            "ngrok-skip-browser-warning": "true",
        }
    });
};
