import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleTemplateDto } from './create-schedule-template.dto';

export class UpdateScheduleTemplateDto extends PartialType(CreateScheduleTemplateDto) {}
