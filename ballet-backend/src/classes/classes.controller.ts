import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  async getAll() {
    return await this.classesService.findAll();
  }

  @Post()
  async create(@Body('name') name: string) {
    return await this.classesService.create(name);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.classesService.remove(Number(id));
  }
}
