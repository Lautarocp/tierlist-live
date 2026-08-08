import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { StoreService } from './store/store.service';

@Controller()
export class AppController {
  constructor(private readonly store: StoreService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('uploads/:filename')
  serveImage(@Param('filename') filename: string, @Res() res: Response) {
    const buffer = this.store.images.get(filename);
    if (!buffer) throw new NotFoundException('Imagen no encontrada');
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }
}
