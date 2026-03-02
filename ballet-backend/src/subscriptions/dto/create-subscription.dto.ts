export class CreateSubscriptionDto {
    user_id: number;
    total_lessons: number;
    remaining_lessons: number; // Добавь, так как мы его шлем с фронта
    purchase_date: string;
    expiry_date: string;
    freeze_limit_days?: number; // Наше новое поле
    status?: string;
}
