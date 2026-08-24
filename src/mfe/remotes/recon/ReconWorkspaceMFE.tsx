import React, { useEffect } from 'react';
import { LiveReconWorkbench } from '../../../components/LiveReconWorkbench';
import { ReconMFEProps } from '../../types';
import { mfeEventBus } from '../../eventBus';

export const ReconWorkspaceMFE: React.FC<ReconMFEProps> = ({
  records,
  dealership,
  activeGstin,
  period,
  onOpenNoticeModal,
  onToggleHoldPayment,
  onApproveRecord,
}) => {
  // Sync state with cross-MFE event bus
  useEffect(() => {
    const unbind = mfeEventBus.on('MATCH_OVERRIDDEN', (payload) => {
      if (payload.action === 'HOLD_PAYMENT') {
        onToggleHoldPayment(payload.recordId);
      } else if (payload.action === 'APPROVE_FOR_3B') {
        onApproveRecord(payload.recordId);
      }
    });

    return () => {
      unbind();
    };
  }, [onToggleHoldPayment, onApproveRecord]);

  return (
    <div className="w-full transition-all duration-300">
      <LiveReconWorkbench
        records={records}
        dealership={dealership}
        activeGstin={activeGstin}
        period={period}
        onOpenNoticeModal={onOpenNoticeModal}
        onToggleHoldPayment={onToggleHoldPayment}
        onApproveRecord={onApproveRecord}
      />
    </div>
  );
};

export default ReconWorkspaceMFE;
