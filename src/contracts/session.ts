export type Role = 'learner' | 'instructor';
export type Access = {
  token: string;
  accountKey: string;
  role: Role;
  label: string;
  canStartDemoRun?: boolean;
};
