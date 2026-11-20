'use client';

import { useEffect, useState } from 'react';
import { demoStore, type DemoSnapshot } from '@/demo/store';

export function useDemo(): DemoSnapshot {
  const [snap, setSnap] = useState<DemoSnapshot>(() => demoStore.snapshot());

  useEffect(() => {
    setSnap(demoStore.snapshot());
    return demoStore.subscribe(() => setSnap(demoStore.snapshot()));
  }, []);

  return snap;
}
