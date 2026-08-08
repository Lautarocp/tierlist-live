import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { StoreModule } from './store/store.module';
import { LiveModule } from './live/live.module';
import { RedisModule } from './redis/redis.module';
import { SessionModule } from './session/session.module';
import { TierListModule } from './tierlist/tierlist.module';

@Module({
  imports: [StoreModule, RedisModule, TierListModule, SessionModule, LiveModule],
  controllers: [AppController],
})
export class AppModule {}
