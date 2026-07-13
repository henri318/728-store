import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
  ProductTranslationSection,
  type ProductTranslationDraft,
} from '@/modules/products/presentation/components/product-translation-section';

describe('ProductTranslationSection', () => {
  it('renders addable tag lists for translated tags and sizes', () => {
    const onChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState<ProductTranslationDraft>({
        name: 'Taza',
        description: 'Base',
        tags: ['hogar'],
        sizes: ['S'],
        designChangeDescription: 'Cambia el frontal',
      });

      return (
        <ProductTranslationSection
          locale="es"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          labels={{
            title: 'Contenido traducido',
            hint: 'Edita cada idioma por separado.',
            nameLabel: 'Nombre',
            descriptionLabel: 'Descripción',
            tagsLabel: 'Etiquetas',
            tagsPlaceholder: 'ropa, verano',
            tagsAddLabel: 'Añadir etiqueta',
            tagsEmptyLabel: 'Aún no hay etiquetas',
            sizesLabel: 'Tallas',
            sizesPlaceholder: 'S, M, L',
            sizesAddLabel: 'Añadir talla',
            sizesEmptyLabel: 'Aún no hay tallas',
            designChangeDescriptionLabel: 'Descripción del cambio',
            designChangeDescriptionHelp:
              'Indica qué elemento puede cambiar y cómo debe hacerlo.',
            designChangeDescriptionPlaceholder: 'Describe el cambio',
          }}
        />
      );
    }

    render(<Harness />);

    expect(screen.getByLabelText('Nombre')).toHaveValue('Taza');
    expect(screen.getByLabelText('Etiquetas')).toHaveValue('');
    expect(screen.getByLabelText('Tallas')).toHaveValue('');
    expect(screen.getByText('hogar')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Etiquetas'), {
      target: { value: 'ropa, verano' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ tags: ['hogar', 'ropa', 'verano'] }),
    );
    expect(screen.getByText('ropa')).toBeInTheDocument();
    expect(screen.getByText('verano')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tallas'), {
      target: { value: 'M' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Añadir talla' }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tags: ['hogar', 'ropa', 'verano'],
        sizes: ['S', 'M'],
      }),
    );
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('restores empty translation arrays when the last tag is removed', () => {
    const onChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState<ProductTranslationDraft>({
        name: 'Samarreta',
        description: 'Base',
        tags: [],
        sizes: [],
        designChangeDescription: 'Canvi actualitzat',
      });

      return (
        <ProductTranslationSection
          locale="cat"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          labels={{
            title: 'Contingut traduït',
            hint: 'Edita cada idioma per separat.',
            nameLabel: 'Nom',
            descriptionLabel: 'Descripció',
            tagsLabel: 'Etiquetes',
            tagsPlaceholder: 'roba, estiu',
            tagsAddLabel: 'Afegir etiqueta',
            tagsEmptyLabel: 'Encara no hi ha etiquetes',
            sizesLabel: 'Talles',
            sizesPlaceholder: 'S, M, L',
            sizesAddLabel: 'Afegir talla',
            sizesEmptyLabel: 'Encara no hi ha talles',
            designChangeDescriptionLabel: 'Descripció del canvi',
            designChangeDescriptionHelp:
              'Indica quin element pot canviar i com ho ha de fer.',
            designChangeDescriptionPlaceholder: 'Descriu el canvi',
          }}
        />
      );
    }

    render(<Harness />);

    expect(screen.getByText('Encara no hi ha etiquetes')).toBeInTheDocument();
    expect(screen.getByText('Encara no hi ha talles')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Etiquetes'), {
      target: { value: 'roba' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Afegir etiqueta' }));

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar roba' }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ tags: [], sizes: [] }),
    );

    expect(screen.getByText('Encara no hi ha etiquetes')).toBeInTheDocument();
  });

  it('renders the designer change-description label, help text, and placeholder', () => {
    render(
      <ProductTranslationSection
        locale="es"
        value={{
          name: '',
          description: '',
          tags: [],
          sizes: [],
          designChangeDescription: null,
        }}
        onChange={vi.fn()}
        labels={{
          title: 'Contenido traducido',
          hint: 'Edita cada idioma por separado.',
          nameLabel: 'Nombre',
          descriptionLabel: 'Descripción',
          tagsLabel: 'Etiquetas',
          tagsPlaceholder: 'ropa, verano',
          tagsAddLabel: 'Añadir etiqueta',
          tagsEmptyLabel: 'Aún no hay etiquetas',
          sizesLabel: 'Tallas',
          sizesPlaceholder: 'S, M, L',
          sizesAddLabel: 'Añadir talla',
          sizesEmptyLabel: 'Aún no hay tallas',
          designChangeDescriptionLabel: '¿Qué podrá personalizar el cliente?',
          designChangeDescriptionHelp:
            'Indica qué elemento puede cambiar y cómo debe hacerlo.',
          designChangeDescriptionPlaceholder:
            'Puedes cambiar el nombre, el color y añadir una imagen.',
        }}
      />,
    );

    expect(
      screen.getByLabelText('¿Qué podrá personalizar el cliente?'),
    ).toHaveAttribute(
      'placeholder',
      'Puedes cambiar el nombre, el color y añadir una imagen.',
    );
    expect(
      screen.getByText(
        'Indica qué elemento puede cambiar y cómo debe hacerlo.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Instrucciones de personalización'),
    ).toBeNull();
    expect(
      screen.queryByText('Instrucciones subidas por el diseñador'),
    ).toBeNull();
  });

  it('does not render the localized photo-label fieldset', () => {
    render(
      <ProductTranslationSection
        locale="cat"
        value={{
          name: 'Tassa',
          description: '',
          tags: [],
          sizes: [],
          designChangeDescription: null,
          photoLabels: { 'img-1': 'Davant' },
        }}
        onChange={vi.fn()}
        labels={{
          title: 'Contingut traduït',
          hint: 'Edita',
          nameLabel: 'Nom',
          descriptionLabel: 'Descripció',
          tagsLabel: 'Etiquetes',
          tagsPlaceholder: '',
          tagsAddLabel: 'Afegir',
          tagsEmptyLabel: 'Buit',
          sizesLabel: 'Talles',
          sizesPlaceholder: '',
          sizesAddLabel: 'Afegir',
          sizesEmptyLabel: 'Buit',
          designChangeDescriptionLabel: 'Canvi',
          designChangeDescriptionHelp: 'Ajuda',
          designChangeDescriptionPlaceholder: 'Descriu',
        }}
      />,
    );

    expect(screen.queryByText('Davant')).toBeNull();
    expect(screen.queryByText('Fotos')).toBeNull();
  });
});
