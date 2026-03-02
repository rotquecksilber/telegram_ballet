import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
    @IsNumber()
    @IsNotEmpty()
    telegram_id: number;

    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsNotEmpty()
    first_name: string;

    @IsString()
    @IsNotEmpty()
    last_name: string;

    @IsString()
    @IsNotEmpty()
    phone: string;
}
