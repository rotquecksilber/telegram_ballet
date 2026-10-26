export class UpdateSubscriptionDto {
    is_frozen?: boolean;
    freeze_start_date?: string | null;
    status?: 'active' | 'frozen' | 'expired' | 'exhausted';
    remaining_lessons?: number;
    total_lessons?: number;
    freeze_days_used?: number;
    expiry_date?: string | null;
    activation_date?: string | null;
    duration_days?: number;
    freeze_limit_days?: number;
}
