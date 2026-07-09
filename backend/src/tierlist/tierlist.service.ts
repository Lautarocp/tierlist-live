import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTierListDto } from './dto/create-tierlist.dto';

@Injectable()
export class TierListService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTierListDto) {
    return this.prisma.tierList.create({
      data: {
        title: dto.title,
        tiers: { create: dto.tiers },
      },
      include: { tiers: { orderBy: { position: 'asc' } } },
    });
  }

  async findOne(id: string) {
    const tierList = await this.prisma.tierList.findUnique({
      where: { id },
      include: {
        tiers: { orderBy: { position: 'asc' } },
        items: true,
      },
    });
    if (!tierList) throw new NotFoundException('Tier list no encontrada');
    return tierList;
  }

  async addItem(tierListId: string, name: string, file?: Express.Multer.File) {
    if (!name?.trim()) throw new BadRequestException('El nombre es requerido');
    const exists = await this.prisma.tierList.findUnique({
      where: { id: tierListId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Tier list no encontrada');
    return this.prisma.item.create({
      data: {
        tierListId,
        name: name.trim(),
        imageUrl: file ? `/uploads/${file.filename}` : null,
      },
    });
  }
}
