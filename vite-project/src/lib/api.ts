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
    broadcast: `${API_URL}/telegram/broadcast`,
    donate: `${API_URL}/telegram/stars-donate`,
    sendScheduleToAll: `${API_URL}/schedule/send-to-all`,
    forceSpendSubscription: (id: number | string) =>
        `${API_URL}/subscriptions/${id}/force-spend`,
    addLessonsSubscription: (id: number | string) =>
        `${API_URL}/subscriptions/${id}/add-lessons`,

    templateById: (id: number | string) => `${API_URL}/schedule-templates/${id}`,

    classes: `${API_URL}/classes`,
    schedule: `${API_URL}/schedule`,
    bookings: `${API_URL}/bookings`,
    userSubscription: (telegram_id: string | number) =>
        `${API_URL}/subscriptions/user/${telegram_id}`,

    userAllSubscriptions: (telegram_id: string | number) =>
        `${API_URL}/subscriptions/user/${telegram_id}/all`,

    userBookings: (userId: string | number) =>
        `${API_URL}/bookings/user/${userId}`,

    freezeSubscription: (id: string | number) =>
        `${API_URL}/subscriptions/${id}/freeze`,

    userBookingsByTg: (tgId: string | number) =>
        `${API_URL}/bookings/user/${tgId}`,
    usersWithSubs: `${API_URL}/users/with-subscriptions`,

    // Stats
    statsSnapshot: `${API_URL}/stats/snapshot`,
    statsTimeseries: (groupBy: 'day' | 'week' | 'month', from?: string, to?: string) => {
        const params = new URLSearchParams({ groupBy });
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        return `${API_URL}/stats/timeseries?${params.toString()}`;
    },
    statsClasses: (from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const qs = params.toString();
        return `${API_URL}/stats/classes${qs ? `?${qs}` : ''}`;
    },
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
