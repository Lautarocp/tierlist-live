import { IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  tierListId: string;
}
