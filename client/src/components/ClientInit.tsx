'use client';

import { useEffect } from 'react';
import { ensureSeed } from '@/lib/helpers';

export default function ClientInit() {
  useEffect(() => {
    ensureSeed().catch(console.error);
  }, []);
  return null;
}
