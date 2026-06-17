import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import DocumentList from '../../components/fellowship/DocumentList';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import { useFellowship, useFellowshipDocuments } from '../../hooks/fellowshipHooks';
import { useFellowshipProjectTitle } from '../../hooks/useFellowshipProjectTitle';
import { extractErrorMessage } from '../../utils/errorUtils';

// Fellow-facing documents page (email deep-link target). The fellow downloads
// the Bitshala-signed unsigned contract, then uploads their signed copy and
// W-8BEN; rejected documents show the reviewer's reason and a re-upload control.
const FellowshipDocuments = () => {
  const { fellowshipId = '' } = useParams<{ fellowshipId: string }>();
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const fellowshipQuery = useFellowship(fellowshipId, { enabled: !!fellowshipId });
  const documentsQuery = useFellowshipDocuments(fellowshipId, { enabled: !!fellowshipId });

  const projectTitle = useFellowshipProjectTitle(fellowshipQuery.data);
  const documents = documentsQuery.data ?? [];
  const isLoading = fellowshipQuery.isLoading || documentsQuery.isLoading;

  return (
    <FellowshipPageLayout
      title="Documents"
      subtitle={
        projectTitle
          ? `Contract and tax documents for ${projectTitle}.`
          : 'Download your contract and upload your signed documents.'
      }
    >
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      {documentsQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {`Couldn't load documents: ${extractErrorMessage(documentsQuery.error)}`}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={22} />
        </Box>
      ) : documents.length > 0 ? (
        <DocumentList
          fellowshipId={fellowshipId}
          documents={documents}
          mode="fellow"
          onNotify={(kind, msg) => setToast({ kind, msg })}
        />
      ) : (
        !documentsQuery.isError && (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 0.75,
              bgcolor: 'background.paper',
              py: 6,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No documents to show yet.
            </Typography>
          </Box>
        )
      )}
    </FellowshipPageLayout>
  );
};

export default FellowshipDocuments;
