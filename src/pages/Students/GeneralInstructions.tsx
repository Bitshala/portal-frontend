import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { useUser } from '../../hooks/userHooks';
import { useMyScores } from '../../hooks/scoreHooks';
import { UserRole } from '../../types/enums';
import GeneralInstructionsContent from '../../components/instructions/GeneralInstructions';

const GeneralInstructions: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { data: scoresData, isLoading: isLoadingScores } = useMyScores();

  // Check if user is TA or Admin
  const isAdminOrTA = userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT;

  // Check if user has access to any cohort
  const hasAccess = isAdminOrTA || (scoresData?.cohorts && scoresData.cohorts.length > 0);

  const isLoading = isLoadingUser || isLoadingScores;

  // Set error if user doesn't have access
  useEffect(() => {
    if (!isLoading && scoresData && !hasAccess) {
      setError('You need to be enrolled in a cohort to access these instructions.');
    }
  }, [isLoading, scoresData, hasAccess]);

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={24} sx={{ color: '#f97316' }} />
          <Typography sx={{ color: '#fafafa', fontWeight: 500 }}>Loading...</Typography>
        </Box>
      </Box>
    );
  }

  if (error || !hasAccess) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', px: 2, py: 4 }}>
        <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 3,
              borderRadius: '50%',
              bgcolor: 'rgba(239,68,68,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={32} color="#f87171" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 1.5 }}>
            Access Restricted
          </Typography>
          <Typography sx={{ color: '#a1a1aa', mb: 4, maxWidth: 400, mx: 'auto' }}>
            {error || 'You need to be enrolled in a cohort to access these instructions.'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/me')}
              sx={{
                bgcolor: '#ea580c',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.2,
                borderRadius: 2,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#c2410c' },
              }}
            >
              View Profile & Cohorts
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/me')}
              sx={{
                color: '#d4d4d8',
                borderColor: '#3f3f46',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.2,
                borderRadius: 2,
                '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              Go Back
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  return <GeneralInstructionsContent />;
};

export default GeneralInstructions;
