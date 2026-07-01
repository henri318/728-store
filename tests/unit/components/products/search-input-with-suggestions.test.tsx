import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  SearchInputWithSuggestions,
  type SearchInputWithSuggestionsProps,
} from '@/components/products/search-input-with-suggestions';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/es',
}));

const baseLabels = {
  placeholder: 'Buscar',
  ariaLabel: 'Buscar productos',
  submitLabel: 'Buscar',
  recentSearchesLabel: 'Búsquedas recientes',
  noRecentSearches: 'Sin búsquedas recientes',
};

const recent = [
  { term: 'ceramic', searchedAt: '2025-01-02T00:00:00.000Z' },
  { term: 'lamp', searchedAt: '2025-01-01T00:00:00.000Z' },
];

/** Helper: render and click the toggle button so the input is visible. */
function renderAndOpen(props: Partial<SearchInputWithSuggestionsProps> = {}) {
  const result = render(
    <SearchInputWithSuggestions
      initialValue=""
      recent={recent}
      locale="es"
      labels={baseLabels}
      {...props}
    />,
  );
  // Click the toggle button to show the input.
  fireEvent.mouseDown(screen.getByRole('button', { name: 'Buscar productos' }));
  return result;
}

describe('SearchInputWithSuggestions', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders the combobox input with an accessible name', () => {
    renderAndOpen();
    const input = screen.getByRole('combobox');
    // The combobox is associated with the visually-hidden label.
    expect(input).toHaveAccessibleName('Buscar productos');
  });

  it('hides the suggestion listbox for guests (recent is null)', () => {
    render(
      <SearchInputWithSuggestions
        initialValue=""
        recent={null}
        locale="es"
        labels={baseLabels}
      />,
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows an empty suggestion listbox for authenticated users with no history', () => {
    renderAndOpen({ recent: [] });
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Sin búsquedas recientes')).toBeInTheDocument();
  });

  it('renders the listbox with the recent terms when authenticated', () => {
    renderAndOpen();
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('ceramic');
    expect(options[1]).toHaveTextContent('lamp');
  });

  it('ArrowDown moves focus to the next option', () => {
    renderAndOpen();
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      expect.stringContaining('opt-1'),
    );
  });

  it('Enter on a focused option calls router.replace with that term', async () => {
    renderAndOpen();
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    // Skip past the first (ceramic) suggestion to reach lamp.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait for the debounced effect to clear so we can isolate the
    // explicit Enter call.
    await new Promise((r) => setTimeout(r, 300));
    mockReplace.mockClear();

    // Re-focus to retrigger and then press Enter.
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('q=lamp'),
      expect.any(Object),
    );
  });

  it('Escape closes the listbox', () => {
    renderAndOpen();
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('debounces router.replace on typing (no immediate call on each keystroke)', async () => {
    renderAndOpen({ recent: [] });
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'c' } });
    fireEvent.change(input, { target: { value: 'ce' } });
    fireEvent.change(input, { target: { value: 'cer' } });
    // 500ms debounce + 3-char minimum — typing "cer" (3 chars) starts
    // the debounce timer at the last change. Give it 800ms total.
    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalled();
      },
      { timeout: 800 },
    );
  });

  it('does NOT call localStorage / sessionStorage / document.cookie', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const cookieSpy = vi.spyOn(document, 'cookie', 'set');

    renderAndOpen();
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ceramic' } });

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(cookieSpy).not.toHaveBeenCalled();

    setItemSpy.mockRestore();
    cookieSpy.mockRestore();
  });

  it('mousedown on a suggestion selects it', () => {
    renderAndOpen();
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    const ceramic = screen.getByRole('option', { name: 'ceramic' });
    fireEvent.mouseDown(ceramic);

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('q=ceramic'),
      expect.any(Object),
    );
  });

  it('rendered listbox has the correct a11y label', () => {
    renderAndOpen();
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toHaveAttribute(
      'aria-label',
      'Búsquedas recientes',
    );
  });
});
