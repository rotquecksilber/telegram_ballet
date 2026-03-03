export class CreateSubscriptionDto {
    user_id: number;
    total_lessons: number;

    // Текущий остаток (обычно равен total_lessons при создании)
    remaining_lessons: number;

    // Дата покупки (обычно сегодня)
    purchase_date: string;

    // Срок действия в днях (например, 30, 60, 90).
    // Именно это число будет использоваться для расчета expiry_date при первом посещении.
    duration_days: number;

    // Теперь это поле опционально, так как оно пересчитается в базе при активации.
    // Можно присылать пустую строку или примерную дату.
    expiry_date?: string;

    // Количество дней доступной заморозки
    freeze_limit_days?: number;

    // Статус (по умолчанию 'active')
    status?: string;
}
