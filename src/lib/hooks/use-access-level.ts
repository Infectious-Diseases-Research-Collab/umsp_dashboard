'use client';

import { useContext } from 'react';
import { AccessLevelContext, type AccessLevel } from '@/components/access/AccessLevelProvider';

/** Access tier of the signed-in user. Must be used under <AccessLevelProvider>. */
export function useAccessLevel(): AccessLevel {
  const value = useContext(AccessLevelContext);
  if (!value) throw new Error('useAccessLevel must be used within AccessLevelProvider');
  return value;
}
