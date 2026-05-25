import React from 'react';
import CohortInstructions from '../../components/instructions/CohortInstructions';
import { pbWeeks } from '../../data/pbWeeks';

const PBInstructions: React.FC = () => {
  return (
    <CohortInstructions
      cohortType="PROGRAMMING_BITCOIN"
      cohortName="PB"
      weeklyContent={pbWeeks}
    />
  );
};

export default PBInstructions;
