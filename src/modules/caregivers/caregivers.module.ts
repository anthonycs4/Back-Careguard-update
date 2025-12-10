import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaregiversController } from './caregivers.controller';
import { CaregiversService } from './caregivers.service';

@Module({
  imports: [ConfigModule],
  controllers: [CaregiversController],
  providers: [CaregiversService],
})
export class CaregiversModule {}
