import type { EventBusPort } from '@/modules/events/domain/event-bus-port';
import { GlobalEvents } from '@/modules/events/domain/event-registry';
import type { EmailQueueRepository } from '@/shared/contracts/email/email-queue-port';
import type { EmailOrderLookupPort } from '../domain/ports/email-order-lookup-port';
import type { EmailUserLookupPort } from '../domain/ports/email-user-lookup-port';
import type { EmailQueueDrainService } from './email-queue-drain-service';
import {
  HandlePasswordResetRequested,
  type PasswordResetRequestedPayload,
} from './handlers/handle-password-reset-requested';
import {
  HandleSellerCreated,
  type SellerCreatedPayload,
} from './handlers/handle-seller-created';
import {
  HandleOrderPlaced,
  type OrderPlacedPayload,
} from './handlers/handle-order-placed';
import {
  HandleOrderInProgress,
  type OrderInProgressPayload,
} from './handlers/handle-order-in-progress';
import {
  HandleOrderCompleted,
  type OrderCompletedPayload,
} from './handlers/handle-order-completed';

export interface EmailEventSubscriberDeps {
  emailQueueRepository: EmailQueueRepository;
  emailUserLookup: EmailUserLookupPort;
  emailOrderLookup: EmailOrderLookupPort;
  emailQueueDrainer?: Pick<EmailQueueDrainService, 'drain'>;
}

function subscribe<T>(
  eventBus: EventBusPort,
  eventName: string,
  label: string,
  handler: (payload: T) => Promise<void>,
  drain?: Pick<EmailQueueDrainService, 'drain'>,
): void {
  eventBus.on(eventName, async (data: unknown) => {
    try {
      await handler(data as T);

      if (!drain) {
        return;
      }

      try {
        await drain.drain({ source: 'inline' });
      } catch {
        console.warn(
          '[EmailEventSubscribers] Inline email queue drain failed',
          {
            event: label,
            source: 'inline',
          },
        );
      }
    } catch (error) {
      console.error(`Error processing ${label} event:`, error);
    }
  });
}

export const EmailEventSubscribers = {
  subscribeAll(eventBus: EventBusPort, deps: EmailEventSubscriberDeps): void {
    const passwordResetRequested = new HandlePasswordResetRequested(
      deps.emailQueueRepository,
      deps.emailUserLookup,
    );
    const sellerCreated = new HandleSellerCreated(
      deps.emailQueueRepository,
      deps.emailUserLookup,
    );
    const orderPlaced = new HandleOrderPlaced(
      deps.emailQueueRepository,
      deps.emailOrderLookup,
    );
    const orderInProgress = new HandleOrderInProgress(
      deps.emailQueueRepository,
      deps.emailOrderLookup,
    );
    const orderCompleted = new HandleOrderCompleted(
      deps.emailQueueRepository,
      deps.emailOrderLookup,
    );

    subscribe<PasswordResetRequestedPayload>(
      eventBus,
      GlobalEvents.PASSWORD_RESET_REQUESTED,
      'PasswordResetRequested',
      (payload) => passwordResetRequested.handle(payload),
      deps.emailQueueDrainer,
    );
    subscribe<SellerCreatedPayload>(
      eventBus,
      GlobalEvents.SELLER_CREATED,
      'SellerCreated',
      (payload) => sellerCreated.handle(payload),
      deps.emailQueueDrainer,
    );
    subscribe<OrderPlacedPayload>(
      eventBus,
      GlobalEvents.ORDER_CREATED,
      'OrderPlaced',
      (payload) => orderPlaced.handle(payload),
      deps.emailQueueDrainer,
    );
    subscribe<OrderInProgressPayload>(
      eventBus,
      GlobalEvents.ORDER_PAID,
      'OrderInProgress',
      (payload) => orderInProgress.handle(payload),
      deps.emailQueueDrainer,
    );
    subscribe<OrderCompletedPayload>(
      eventBus,
      GlobalEvents.ORDER_READY_FOR_PRODUCTION,
      'OrderCompleted',
      (payload) => orderCompleted.handle(payload),
      deps.emailQueueDrainer,
    );
  },
};
