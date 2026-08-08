import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import { randomUUID } from 'crypto';
import { StoreService } from '../store/store.service';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

@Injectable()
export class SessionService {
  constructor(private readonly store: StoreService) {}

  create(tierListId: string) {
    const tierList = this.store.tierLists.get(tierListId);
    if (!tierList) throw new NotFoundException('Tier list no encontrada');
    if (tierList.items.length === 0) {
      throw new BadRequestException('La tier list no tiene items');
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateCode();
      if (this.store.sessionsByCode.has(code)) continue;
      const session = {
        id: randomUUID(),
        code,
        tierListId,
        tierList,
        status: 'LOBBY' as const,
        streamerToken: randomBytes(24).toString('hex'),
      };
      this.store.sessionsByCode.set(code, session);
      this.store.sessionsById.set(session.id, session);
      return session;
    }
    throw new BadRequestException('No se pudo generar un código único');
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[randomInt(CODE_CHARS.length)];
    }
    return code;
  }
}
