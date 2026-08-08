import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StoreService } from '../store/store.service';
import { CreateTierListDto } from './dto/create-tierlist.dto';

@Injectable()
export class TierListService {
  constructor(private readonly store: StoreService) {}

  create(dto: CreateTierListDto) {
    const id = randomUUID();
    const tierList = {
      id,
      title: dto.title,
      tiers: dto.tiers.map((t) => ({ id: randomUUID(), ...t })),
      items: [],
    };
    this.store.tierLists.set(id, tierList);
    return tierList;
  }

  findOne(id: string) {
    const tierList = this.store.tierLists.get(id);
    if (!tierList) throw new NotFoundException('Tier list no encontrada');
    return tierList;
  }

  addItem(tierListId: string, name: string, file?: Express.Multer.File) {
    if (!name?.trim()) throw new BadRequestException('El nombre es requerido');
    const tierList = this.store.tierLists.get(tierListId);
    if (!tierList) throw new NotFoundException('Tier list no encontrada');
    const item = {
      id: randomUUID(),
      name: name.trim(),
      imageUrl: file?.filename ? `/uploads/${file.filename}` : null,
    };
    tierList.items.push(item);
    return item;
  }
}
