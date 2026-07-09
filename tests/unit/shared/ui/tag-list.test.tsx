import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DictionaryProvider } from '@/shared/i18n/dictionary-context';
import es from '@/shared/i18n/locales/es.json';
import { TagList } from '@/shared/ui/tag-list';

describe('TagList', () => {
  it('uses the generic remove label instead of the cart label', () => {
    const dict = {
      ...es,
      common: {
        ...es.common,
        remove: 'Borrar',
        removeFromCart: 'Eliminar del carrito',
      },
    } as typeof es;

    const onChange = vi.fn();

    render(
      <DictionaryProvider dict={dict}>
        <TagList
          label="Etiquetas"
          addLabel="Añadir"
          emptyLabel="Sin etiquetas"
          value={['hogar']}
          onChange={onChange}
        />
      </DictionaryProvider>,
    );

    expect(
      screen.getByRole('button', { name: 'Borrar hogar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Eliminar del carrito hogar' }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Borrar hogar' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
