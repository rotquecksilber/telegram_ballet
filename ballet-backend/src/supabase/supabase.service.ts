import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
    private readonly supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY // Работаем с правами администратора
        );
    }

    getClient() {
        return this.supabase;
    }
}
