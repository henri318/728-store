import { StatusBadge } from '@/shared/ui/status-badge';
import type { DataTableColumn } from '@/shared/ui/data-table';
import type { OrderEntity } from '@/modules/orders/domain/order-repository';
import { Money } from '@/shared/kernel/domain/value-objects/money';
import { Currency } from '@/shared/kernel/domain/value-objects/currency';
import { ORDER_STATUS_LABELS } from '@/modules/orders/presentation/order-status-labels';

export function createOrderCommonColumns(
  locale: string,
  statusHeader: string,
  dateHeader: string,
  totalHeader: string,
  dict: Record<string, string | undefined>,
): DataTableColumn<OrderEntity>[] {
  return [
    {
      key: 'status',
      header: statusHeader,
      render: (order) => {
        const labelKey = ORDER_STATUS_LABELS[order.status];
        const label = labelKey
          ? (dict[labelKey] ?? order.status)
          : order.status;
        return <StatusBadge status={order.status} label={label} />;
      },
    },
    {
      key: 'date',
      header: dateHeader,
      render: (order) =>
        order.createdAt
          ? new Date(order.createdAt).toLocaleDateString(locale)
          : '',
    },
    {
      key: 'total',
      header: totalHeader,
      render: (order) => Money.format(order.total, Currency.EUR),
    },
  ];
}
