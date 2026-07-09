import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Sin caracteres ambiguos al dictar en voz alta (0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tierListId: string) {
    const tierList = await this.prisma.tierList.findUnique({
      where: { id: tierListId },
      include: { _count: { select: { items: true } } },
    });
    if (!tierList) throw new NotFoundException('Tier list no encontrada');
    if (tierList._count.items === 0) {
      throw new BadRequestException('La tier list no tiene items');
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateCode();
      const existing = await this.prisma.session.findUnique({
        where: { code },
        select: { id: true },
      });
      if (existing) continue;
      return this.prisma.session.create({
        data: {
          tierListId,
          code,
          streamerToken: randomBytes(24).toString('hex'),
        },
      });
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
