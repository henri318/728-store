'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Modal } from '@/shared/ui/modal';

export interface UnsavedChangesLabels {
  title: string;
  message: string;
  leave: string;
  stay: string;
}

export function useUnsavedChangesGuard(
  isDirty: boolean,
  labels: UnsavedChangesLabels,
): ReactNode {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = labels.message;
    };
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element | null)?.closest('a');
      if (!anchor || anchor.target === '_blank' || !anchor.href) return;
      const destination = new URL(anchor.href, globalThis.location.href);
      if (destination.origin !== globalThis.location.origin) return;
      event.preventDefault();
      setPendingHref(
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleClick);
    };
  }, [isDirty, labels.message]);

  const leave = () => {
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  };

  return (
    <Modal isOpen={pendingHref !== null} onClose={() => setPendingHref(null)}>
      <div role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
        <h2 id="unsaved-title">{labels.title}</h2>
        <p>{labels.message}</p>
        <Button
          type="button"
          data-action="stay"
          onClick={() => setPendingHref(null)}
        >
          {labels.stay}
        </Button>
        <Button
          type="button"
          data-action="leave"
          variant="danger"
          onClick={leave}
        >
          {labels.leave}
        </Button>
      </div>
    </Modal>
  );
}
