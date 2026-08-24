import React from 'react';
import { SalesInvoicesAndIrnView } from '../../../components/SalesInvoicesAndIrnView';
import { SalesMFEProps } from '../../types';

export const SalesWorkspaceMFE: React.FC<SalesMFEProps> = () => {
  return (
    <div className="w-full transition-all duration-300">
      <SalesInvoicesAndIrnView />
    </div>
  );
};

export default SalesWorkspaceMFE;
