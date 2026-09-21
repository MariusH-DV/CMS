import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

class PlaylistItemInput {
  @IsString()
  mediaAssetId!: string;

  @IsInt()
  @Min(1)
  durationSeconds!: number;
}

export class SetPlaylistItemsDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => PlaylistItemInput)
  items!: PlaylistItemInput[];
}
