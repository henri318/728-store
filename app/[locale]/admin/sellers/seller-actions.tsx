'use client';

import { useState } from 'react';
import { useDictionary } from '@/shared/i18n/dictionary-context';

interface SellerActionsProps {
  sellerId: string;
  currentStatus: string;
}

/**
 * Client component for seller status management actions.
 * Renders action buttons based on current status and handles
 * the PATCH request to change seller status.
 */
export function SellerActions({ sellerId, currentStatus }: SellerActionsProps) {
  const dict = useDictionary();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  // Banned is terminal — no actions available
  if (status === 'banned') {
    return null;
  }

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sellers/${sellerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        throw new Error('Failed to update status');
      }
      const data = await res.json();
      setStatus(data.status);
    } catch {
      // In a real app, show an error toast
      console.error('Failed to change seller status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span style={{ marginLeft: '8px' }}>
      {status === 'active' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => handleStatusChange('suspended')}
        >
          {loading ? '...' : dict.admin.suspend}
        </button>
      )}
      {status === 'suspended' && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusChange('active')}
          >
            {loading ? '...' : dict.admin.activate}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusChange('banned')}
            style={{ marginLeft: '4px' }}
          >
            {loading ? '...' : dict.admin.ban}
          </button>
        </>
      )}
    </span>
  );
}
