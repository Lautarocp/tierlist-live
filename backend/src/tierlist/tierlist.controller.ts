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
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CreateTierListDto } from './dto/create-tierlist.dto';
import { TierListService } from './tierlist.service';

const imageUpload = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
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
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('name') name: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.addItem(id, name, file);
  }
}
