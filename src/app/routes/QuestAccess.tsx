import type { ReactNode } from 'react';
import workshop from '../../assets/workshop-evening.webp';
import './quest-access.css';

export function QuestAccess({ children }: { children: ReactNode }) {
  return (
    <div className="quest-access">
      <div className="quest-access-copy">{children}</div>
      <img className="quest-access-postcard" src={workshop} alt="" width={1440} height={810} />
    </div>
  );
}
