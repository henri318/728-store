import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Link from 'next/link';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: ComponentProps<'a'>) => (
    <a {...props}>{children}</a>
  ),
}));
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

function ReactNavigationHarness() {
  const guard = useUnsavedChangesGuard(true, labels);

  return (
    <>
      {guard}
      <Link
        href="/es/seller/products"
        onClick={(event) => event.preventDefault()}
      >
        Volver a productos
      </Link>
    </>
  );
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
    expect(
      document.querySelector('[data-testid="unsaved-actions"]'),
    ).toContainElement(document.querySelector('button[data-action="stay"]'));
    expect(
      document.querySelector('[data-testid="unsaved-actions"]'),
    ).toContainElement(document.querySelector('button[data-action="leave"]'));
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

  it('intercepts links whose React handler prevents the default navigation', () => {
    render(<ReactNavigationHarness />);

    fireEvent.click(screen.getByRole('link', { name: 'Volver a productos' }));

    expect(document.querySelector('[role="dialog"]')).toHaveTextContent(
      labels.message,
    );
  });
});
