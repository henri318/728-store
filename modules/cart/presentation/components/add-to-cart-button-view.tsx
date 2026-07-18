import { AddToCartChoiceModal } from './add-to-cart-choice-modal';
import type { ButtonState, CartButtonLabels } from './add-to-cart-types';
import styles from './add-to-cart-button.module.css';

const MAX_QUANTITY = 99;

interface AddToCartButtonViewProps {
  state: ButtonState;
  quantity: number;
  isInCart: boolean;
  productInCart: boolean;
  isAuthenticated: boolean;
  hasCustomization: boolean;
  showCustomizationChoice: boolean;
  savingDesign: boolean;
  disabled: boolean;
  labels: CartButtonLabels;
  customizeHref?: string;
  customizationChoiceTitle: string;
  onAdd: (event: React.MouseEvent) => Promise<void>;
  onAddAnother: (event: React.MouseEvent) => Promise<void>;
  onAddWithoutCustomization: () => Promise<void>;
  onCloseChoice: () => void;
  onIncrement: () => Promise<void>;
  onDecrement: () => Promise<void>;
  onRemove: () => Promise<void>;
  onSaveDesign: () => Promise<void>;
}

function feedbackFor(state: ButtonState, labels: CartButtonLabels) {
  if (state === 'adding') return labels.adding;
  if (state === 'success') return labels.added;
  if (state === 'error') return labels.error;
  return labels.addToCart;
}

function QuantityControls({ props }: { props: AddToCartButtonViewProps }) {
  const { labels, quantity, savingDesign, state } = props;
  const controlsDisabled = props.disabled || savingDesign || state === 'adding';
  return (
    <div className={styles.quantityRow}>
      <div className={styles.quantityControls}>
        <button
          type="button"
          className={styles.quantityButton}
          onClick={props.onDecrement}
          disabled={controlsDisabled || quantity <= 1}
          aria-label={labels.decreaseQuantity ?? 'Decrease quantity'}
        >
          −
        </button>
        <span className={styles.quantityDisplay} aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          className={styles.quantityButton}
          onClick={props.onIncrement}
          disabled={controlsDisabled || quantity >= MAX_QUANTITY}
          aria-label={labels.increaseQuantity ?? 'Increase quantity'}
        >
          +
        </button>
      </div>
      {props.hasCustomization && labels.saveDesign ? (
        <button
          type="button"
          className={styles.saveButton}
          onClick={props.onSaveDesign}
          disabled={controlsDisabled}
        >
          {savingDesign
            ? (labels.savingDesign ?? labels.saveDesign)
            : labels.saveDesign}
        </button>
      ) : null}
      {props.hasCustomization && labels.addAnotherPersonalization ? (
        <button
          type="button"
          className={styles.saveButton}
          onClick={props.onAddAnother}
          disabled={controlsDisabled}
        >
          {state === 'adding'
            ? labels.adding
            : labels.addAnotherPersonalization}
        </button>
      ) : null}
      <button
        type="button"
        className={styles.iconButton}
        onClick={props.onRemove}
        disabled={controlsDisabled}
        aria-label={labels.removeFromCart}
      >
        <svg aria-hidden="true" width="36" height="36">
          <use href="/img/icons/sprites.svg#icon-trash" />
        </svg>
      </button>
    </div>
  );
}

function AddAction({ props }: { props: AddToCartButtonViewProps }) {
  const { labels, state } = props;
  return (
    <>
      <AddToCartChoiceModal
        open={props.showCustomizationChoice}
        badgeLabel={labels.customizationChoiceBadge ?? 'Customizable product'}
        title={props.customizationChoiceTitle}
        message={
          labels.customizationChoiceMessage ??
          'You can customize this product first or add it as-is.'
        }
        customizeLabel={labels.customizeProduct ?? 'Customize'}
        addWithoutCustomizationLabel={
          labels.addWithoutCustomization ?? 'Add without customization'
        }
        customizeHref={props.customizeHref}
        onAddWithoutCustomization={props.onAddWithoutCustomization}
        onClose={props.onCloseChoice}
      />
      <div className={styles.addRow}>
        <button
          type="button"
          className={`${styles.iconButton} ${state === 'adding' ? styles.loading : ''}`}
          onClick={props.onAdd}
          disabled={props.disabled || state === 'adding'}
          aria-label={feedbackFor(state, labels)}
        >
          <svg aria-hidden="true" width="40" height="40">
            <use href="/img/icons/sprites.svg#icon-add" />
          </svg>
        </button>
      </div>
    </>
  );
}

export function AddToCartButtonView(props: AddToCartButtonViewProps) {
  const feedback = feedbackFor(props.state, props.labels);
  if (props.state === 'success' || props.state === 'error') {
    const className = props.state === 'success' ? styles.success : styles.error;
    return (
      <button
        type="button"
        className={`${styles.button} ${className}`}
        disabled
        aria-label={feedback}
      >
        {feedback}
      </button>
    );
  }
  if (props.isInCart) return <QuantityControls props={props} />;
  if (
    props.productInCart &&
    props.hasCustomization &&
    props.isAuthenticated &&
    props.labels.addAnotherPersonalization
  ) {
    return (
      <div className={styles.quantityRow}>
        <button
          type="button"
          className={styles.saveButton}
          onClick={props.onAddAnother}
          disabled={
            props.disabled || props.savingDesign || props.state === 'adding'
          }
        >
          {props.state === 'adding'
            ? props.labels.adding
            : props.labels.addAnotherPersonalization}
        </button>
      </div>
    );
  }
  return <AddAction props={props} />;
}
