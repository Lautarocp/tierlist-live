import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const FLUSH_INTERVAL_MS = 2000;

@Injectable()
export class PersistenceService implements OnModuleDestroy {
  private readonly logger = new Logger(PersistenceService.name);
  private buffer: Prisma.ItemResultCreateManyInput[] = [];
  private flushing: Promise<void> = Promise.resolve();
  private readonly timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);

  constructor(private readonly prisma: PrismaService) {}

  enqueue(result: Prisma.ItemResultCreateManyInput) {
    this.buffer.push(result);
  }

  flush(): Promise<void> {
    this.flushing = this.flushing.then(async () => {
      if (this.buffer.length === 0) return;
      const batch = this.buffer.splice(0);
      try {
        await this.prisma.itemResult.createMany({ data: batch });
      } catch (err) {
        this.buffer.unshift(...batch);
        this.logger.error(`Fallo al persistir ${batch.length} resultados`, err);
      }
    });
    return this.flushing;
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.flush();
  }
}
