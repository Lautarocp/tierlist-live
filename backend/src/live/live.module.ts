import { Module } from '@nestjs/common';
import { LiveGateway } from './live.gateway';
import { LiveService } from './live.service';
import { PersistenceService } from './persistence.service';

@Module({
  providers: [LiveGateway, LiveService, PersistenceService],
})
export class LiveModule {}
