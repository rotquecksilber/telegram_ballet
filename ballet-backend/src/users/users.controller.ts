import {Controller, Post, Body, HttpException, HttpStatus, Query, Get, Param, Patch} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}
    @Get('init')
    async init(@Query('id') id: string) {
        try {
            // Нам нужно найти юзера и проверить, админ ли он
            const userData = await this.usersService.getUserByTelegramId(Number(id));

            // Возвращаем структуру, которую ждет фронт
            return {
                user: userData, // Будет null, если юзер еще не зарегистрирован
                isAdmin: userData?.is_admin || false
            };
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        try {
            return await this.usersService.createOrUpdateUser(createUserDto);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }
    @Get('all')
    async getAll() {
        return await this.usersService.findAll();
    }

    @Get('teachers')
    async getTeachers() {
        return await this.usersService.findTeachers();
    }

    @Patch(':id/teacher-status')
    async setTeacherStatus(@Param('id') id: string, @Body('is_teacher') is_teacher: boolean) {
        // Убираем Number()! Передаем id как строку.
        return await this.usersService.updateTeacherStatus(id, is_teacher);
    }

    @Get('with-subscriptions')
    async findAllWithSubs() {
        return this.usersService.findAllWithSubscriptions();
    }

}
