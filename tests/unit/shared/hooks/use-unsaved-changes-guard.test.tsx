import { act, render, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

const labels = {
  title: 'Cambios sin guardar',
  message: 'Tienes cambios sin guardar. ¿Quieres salir?',
  leave: 'Salir',
  stay: 'Seguir editando',
};

function Harness() {
  return useUnsavedChangesGuard(true, labels);
}

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks beforeunload as cancelable while dirty', () => {
    renderHook(() => useUnsavedChangesGuard(true, labels));
    const event = new Event('beforeunload', { cancelable: true });

    globalThis.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('does not intercept a navigation link when clean', () => {
    renderHook(() => useUnsavedChangesGuard(false, labels));
    const link = document.createElement('a');
    link.href = '/es/seller/products';
    document.body.append(link);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('shows an accessible confirmation and proceeds after leaving', () => {
    render(<Harness />);
    const link = document.createElement('a');
    link.href = '/es/seller/products';
    document.body.append(link);

    act(() => {
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });

    expect(document.querySelector('[role="dialog"]')).toHaveTextContent(
      labels.message,
    );
    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[data-action="leave"]')
        ?.click();
    });

    expect(push).toHaveBeenCalledWith('/es/seller/products');
  });

  it('keeps the form guarded when the user stays', () => {
    render(<Harness />);
    const link = document.createElement('a');
    link.href = '/es/seller/products';
    document.body.append(link);

    act(() => {
      link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });
    act(() => {
      document
        .querySelector<HTMLButtonElement>('button[data-action="stay"]')
        ?.click();
    });

    expect(push).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
