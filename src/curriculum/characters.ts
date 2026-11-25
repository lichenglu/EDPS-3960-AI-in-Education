import characters from './characters.json';

export const courseCast = characters;
export type CharacterId = keyof typeof courseCast;
