import { IsEmail } from 'class-validator';

export class SendTestMailDto {
  @IsEmail()
  to!: string;
}
