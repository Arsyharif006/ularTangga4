'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnlinePage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/online/mode');
  }, [router]);

  return null;
}
