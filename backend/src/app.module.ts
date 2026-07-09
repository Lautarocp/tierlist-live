import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LiveModule } from './live/live.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SessionModule } from './session/session.module';
import { TierListModule } from './tierlist/tierlist.module';

@Module({
  imports: [PrismaModule, RedisModule, TierListModule, SessionModule, LiveModule],
  controllers: [AppController],
})
export class AppModule {}
