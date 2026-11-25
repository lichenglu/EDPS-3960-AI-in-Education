import type { Quest } from '../types';
import { topics } from './es';

export function courseTopic(quest: Pick<Quest, 'id' | 'topic'>, locale: 'en' | 'es') {
  return (locale === 'es' && topics[quest.id]) || quest.topic;
}
