import React from 'react';
import { DailyActionHub } from '../../../components/DailyActionHub';
import { OEMIncentiveTracker } from '../../../components/OEMIncentiveTracker';
import { GSTR3BSummaryView } from '../../../components/GSTR3BSummaryView';
import { ComplianceMFEProps } from '../../types';

export const ComplianceWorkspaceMFE: React.FC<ComplianceMFEProps> = ({
  records,
  dealership,
  period,
  activeSubTab = 'daily-hub',
  onNavigateTab,
  onOpenNoticeModal,
}) => {
  const handleOpenNotice = () => {
    if (onOpenNoticeModal) {
      const missingRec = records.find((r) => r.matchStatus === 'MISSING_IN_2B') || records[0];
      if (missingRec) {
        onOpenNoticeModal(missingRec);
      }
    }
  };

  return (
    <div className="w-full transition-all duration-300">
      {activeSubTab === 'daily-hub' && (
        <DailyActionHub
          onNavigateTab={onNavigateTab || (() => {})}
          onOpenNoticeModal={handleOpenNotice}
        />
      )}

      {activeSubTab === 'oem-tracker' && (
        <OEMIncentiveTracker dealership={dealership} />
      )}

      {activeSubTab === 'gstr3b-summary' && (
        <GSTR3BSummaryView
          records={records}
          dealership={dealership}
          period={period}
        />
      )}
    </div>
  );
};

export default ComplianceWorkspaceMFE;
