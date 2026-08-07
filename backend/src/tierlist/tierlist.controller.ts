import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { writeFile } from 'fs/promises';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { CreateTierListDto } from './dto/create-tierlist.dto';
import { TierListService } from './tierlist.service';

const imageUpload = {
  storage: memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: Function) => {
    if (/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new BadRequestException('Solo se permiten imágenes'), false);
  },
};

@Controller('tierlists')
export class TierListController {
  constructor(private readonly service: TierListService) {}

  @Post()
  create(@Body() dto: CreateTierListDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/items')
  @UseInterceptors(FileInterceptor('image', imageUpload))
  async addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('name') name: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      const filename = `${randomUUID()}.jpg`;
      await sharp(file.buffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(join('./uploads', filename));
      file.filename = filename;
    }
    return this.service.addItem(id, name, file);
  }
}
