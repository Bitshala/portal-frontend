import React, { useState, useEffect } from 'react';
import { Box, Link } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { getAuthTokenFromStorage } from '../../services/authService';

const isImageFile = (filename: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);

interface AttachmentProps {
  filename: string;
  url: string;
  // Optional style overrides for the rendered image (e.g. larger sizing when projected).
  imgSx?: SxProps<Theme>;
}

// Renders a cohort attachment. Images are fetched with the auth token and shown
// inline as a blob; anything else falls back to a download link.
const Attachment: React.FC<AttachmentProps> = ({ filename, url, imgSx }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!isImageFile(filename)) return;
    let objectUrl: string;
    const token = getAuthTokenFromStorage();
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setImgFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, filename]);

  if (isImageFile(filename) && !imgFailed) {
    return blobUrl ? (
      <Box
        component="img"
        src={blobUrl}
        alt={filename}
        sx={[
          { maxWidth: '100%', borderRadius: 2, border: '1px solid #3f3f46', display: 'block' },
          ...(Array.isArray(imgSx) ? imgSx : [imgSx]),
        ]}
      />
    ) : null;
  }

  return (
    <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ color: '#60a5fa', fontSize: '0.9rem' }}>
      {filename}
    </Link>
  );
};

export default Attachment;
