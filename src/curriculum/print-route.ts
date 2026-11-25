export function questPrintPath(id: string) {
  return `/quests/${id}/print`;
}

export function printQuestId(path: string) {
  return /^\/quests\/(w\d{2})\/print\/?$/.exec(path)?.[1];
}
