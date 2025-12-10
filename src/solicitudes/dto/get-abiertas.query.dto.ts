import { IsInt, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAbiertasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  // Filtra por una fecha concreta (YYYY-MM-DD)
  @IsOptional()
  @IsDateString()
  fecha?: string;
}
