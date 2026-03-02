export class UpdateSubscriptionDto {
    is_frozen?: boolean;
    freeze_start_date?: string | null;
    status?: 'active' | 'frozen' | 'expired' | 'exhausted';
    remaining_lessons?: number;
    freeze_days_used?: number;
}
