export type Step = {
  id: string;
  stage: string;
  type: string;
  independent?: boolean;
  feedback?: string;
  options?: readonly { best?: boolean }[];
};
export type Quest = { version: string | number; steps?: readonly Step[] };
export type ActiveQuest = Quest & { steps: readonly Step[] };
export type QuestCatalog = Record<string, Quest>;
export type ProgressState = { index: number; entries: Record<string, Record<string, unknown>> };
export type SavedCheckpoint = { revision: number; state: string; lastSaved: string };
export type Account = { id: string; course_id: string; role: 'learner' | 'instructor'; label: string };
export type RosterLearner = Pick<Account, 'id' | 'label'>;
export type StageRow = { quest_id: string; quest_version: string; stage_status: string };
export type Bottle = { id: string; text: string };
