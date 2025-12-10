import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCuidadorDto {
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  anios_experiencia?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifa_hora?: number;
}
