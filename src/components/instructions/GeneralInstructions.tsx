import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useGeneralInstructions } from '../../hooks/cohortHooks';

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="h5"
    sx={{ fontWeight: 700, color: '#fb923c', mb: 2, fontSize: { xs: '1.4rem', sm: '1.65rem' } }}
  >
    {children}
  </Typography>
);

const Paragraph = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ color: '#d4d4d8', fontSize: '1rem', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
    {children}
  </Typography>
);

const GeneralInstructions: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGeneralInstructions();

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fafafa' }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4, md: 6 }, py: { xs: 3, sm: 5 } }}>
        {/* Back button */}
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{
            color: '#a1a1aa',
            textTransform: 'none',
            fontWeight: 500,
            mb: 4,
            px: 1.5,
            '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          Back
        </Button>

        {/* Header */}
        <Box sx={{ mb: 5 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#fb923c',
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.5rem' },
            }}
          >
            {data?.title ?? 'General Instructions'}
          </Typography>
          {data?.intro && (
            <Typography sx={{ color: '#a1a1aa', fontSize: '1.1rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {data.intro}
            </Typography>
          )}
        </Box>

        {/* Sections */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {data?.sections.map((section) => (
            <Box key={section.key}>
              <SectionTitle>{section.heading}</SectionTitle>
              <Paragraph>{section.body}</Paragraph>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default GeneralInstructions;
