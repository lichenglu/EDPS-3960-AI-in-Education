import { Title } from 'animal-island-ui';
import type { ReactNode } from 'react';
import './ribbon-heading.css';

type Props = {
  children: ReactNode;
  label?: string;
  compact?: boolean;
  accessibleName?: string;
  color?: 'app-yellow' | 'app-green';
};

export function RibbonHeading({
  children,
  label,
  compact = false,
  accessibleName,
  color = 'app-yellow',
}: Props) {
  const ribbon = (
    <Title className="course-ribbon" color={color} size={compact ? 'small' : 'middle'}>
      {label ?? children}
    </Title>
  );

  if (!label) return <h1 className="ribbon-heading-row">{ribbon}</h1>;

  if (compact)
    return (
      <h1 className="ribbon-heading ribbon-heading--compact" aria-label={accessibleName}>
        {ribbon}
        <span className="ribbon-heading-text">{children}</span>
      </h1>
    );

  return (
    <div className="ribbon-heading">
      {ribbon}
      <h1 aria-label={accessibleName}>{children}</h1>
    </div>
  );
}
