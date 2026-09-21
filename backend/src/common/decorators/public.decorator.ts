import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Markiert eine Route als oeffentlich zugaenglich (keine JWT-Pruefung). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
