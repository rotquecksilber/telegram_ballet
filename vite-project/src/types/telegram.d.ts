// src/telegram.d.ts

interface TelegramWebAppUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
    [key: string]: any;
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        user?: TelegramWebAppUser;
        hash: string;
        auth_date: number;
        [key: string]: any;
    };
    ready: () => void;
    expand: () => void;
    close: () => void;
    // можно добавить другие методы по мере необходимости
    [key: string]: any;
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

export {};
