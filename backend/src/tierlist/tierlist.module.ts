import { Module } from '@nestjs/common';
import { TierListController } from './tierlist.controller';
import { TierListService } from './tierlist.service';

@Module({
  controllers: [TierListController],
  providers: [TierListService],
})
export class TierListModule {}
