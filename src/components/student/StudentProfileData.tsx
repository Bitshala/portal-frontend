import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Autocomplete,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { AlertTriangle } from 'lucide-react';
import { useUser, useUpdateUser } from '../../hooks/userHooks';

interface UserProfile {
  id: string;
  email: string;
  discordUsername: string;
  discordGlobalName: string;
  name: string | null;
  role: string;
  description: string | null;
  background: string | null;
  githubProfileUrl: string | null;
  portfolioUrl: string | null;
  linkedinProfileUrl: string | null;
  skills: string[];
  firstHeardAboutBitcoinOn: string | null;
  bitcoinBooksRead: string[];
  whyBitcoin: string | null;
  weeklyCohortCommitmentHours: number | null;
  location: string | null;
  referral: string | null;
}

const SKILLS_OPTIONS = [
  "No skills",
  "Full-stack",
  "Front-end",
  "Back-end",
  "Dev ops",
  "UI/UX design",
  "Prompt engineering",
  "Rust",
  "Python",
  "C++",
  "Golang",
  "Graphic Design",
  "Video Editing",
  "Product Management",
  "Accounting",
  "Law",
  "Sales",
  "Business Operations",
  "Others"
];

const BITCOIN_BOOKS_OPTIONS = [
  "Haven't read any",
  "Mastering Bitcoin",
  "Mastering Lightning Network",
  "BPD",
  "LPD",
  "Learning Bitcoin through Command Line",
  "Programming Bitcoin",
  "The Bitcoin Standard",
  "Sovereign Individual",
  "The Broken Money",
  "The Blocksize War",
  "Others"
];

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#18181b',
    borderRadius: 2.5,
    color: '#fafafa',
    border: '1px solid #27272a',
    transition: 'border-color 200ms, box-shadow 200ms',
    '& fieldset': { border: 'none' },
    '&:hover': { borderColor: '#3f3f46' },
    '&.Mui-focused': { borderColor: '#f97316', boxShadow: '0 0 0 2px rgba(249,115,22,0.15)' },
  },
  '& .MuiInputBase-input': { color: '#fafafa', py: 1.5, px: 2 },
  '& .MuiInputBase-input::placeholder': { color: '#52525b', opacity: 1 },
  '& .MuiOutlinedInput-root.Mui-disabled': {
    bgcolor: '#0a0a0a',
    borderColor: '#1c1c1e',
    '& .MuiInputBase-input': { color: '#71717a', WebkitTextFillColor: '#71717a' },
  },
};

const autocompleteSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#18181b',
    borderRadius: 2.5,
    color: '#fafafa',
    border: '1px solid #27272a',
    transition: 'border-color 200ms, box-shadow 200ms',
    '& fieldset': { border: 'none' },
    '&:hover': { borderColor: '#3f3f46' },
    '&.Mui-focused': { borderColor: '#f97316', boxShadow: '0 0 0 2px rgba(249,115,22,0.15)' },
  },
  '& .MuiInputBase-input': { color: '#fafafa' },
  '& .MuiInputBase-input::placeholder': { color: '#52525b', opacity: 1 },
  '& .MuiAutocomplete-popupIndicator': { color: '#71717a' },
  '& .MuiAutocomplete-clearIndicator': { color: '#71717a' },
};

const sectionSx = {
  bgcolor: '#0a0a0a',
  border: '1px solid #1c1c1e',
  borderRadius: 4,
  p: { xs: 2.5, sm: 3.5 },
};

const labelSx = { fontWeight: 600, color: '#d4d4d8', mb: 1, fontSize: '0.875rem' };
const hintSx = { color: '#71717a', fontSize: '0.75rem', mt: 0.5 };

const StudentProfileData: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();

  useEffect(() => {
    if (userData) {
      setProfile({
        ...userData,
        skills: userData.skills || [],
        bitcoinBooksRead: userData.bitcoinBooksRead || [],
      });
    }
  }, [userData]);

  useEffect(() => {
    if (location.state?.showEmailPopup) {
      setShowEmailPopup(true);
    }
  }, [location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (!profile) return;

    setProfile(prev => {
      if (!prev) return prev;
      if (name === 'weeklyCohortCommitmentHours') {
        return { ...prev, [name]: value ? parseInt(value) : null };
      }
      return { ...prev, [name]: value || null };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (profile.skills.length === 0) {
      setNotification({ show: true, message: 'Please select at least one skill', type: 'error' });
      return;
    }

    if (profile.bitcoinBooksRead.length === 0) {
      setNotification({ show: true, message: 'Please select at least one book/resource', type: 'error' });
      return;
    }

    updateUser(profile, {
      onSuccess: () => {
        setNotification({ show: true, message: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => navigate('/myDashboard'), 1200);
      },
      onError: () => {
        setNotification({ show: true, message: 'Error updating profile', type: 'error' });
      },
    });
  };

  if (isLoadingUser) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#000' }}>
        <CircularProgress sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#000' }}>
        <Typography sx={{ color: '#fafafa', fontWeight: 500 }}>Failed to load profile</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', p: { xs: 2, sm: 3 } }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#fafafa', mb: 1, fontSize: { xs: '1.875rem', sm: '2.125rem' } }}>
          Profile Data
        </Typography>
        <Typography sx={{ color: '#71717a', mb: 4, fontSize: '0.9rem' }}>
          Keep your profile information up to date.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Section: Identity */}
          <Box sx={sectionSx}>
            <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1rem', mb: 3 }}>Identity</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="body2" sx={labelSx}>Certificate Name*</Typography>
                <TextField
                  fullWidth
                  name="name"
                  value={profile.name || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  placeholder="Your full name"
                  sx={inputSx}
                />
                <Typography sx={hintSx}>This name will appear on your certificate.</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>Location*</Typography>
                <TextField
                  fullWidth
                  name="location"
                  value={profile.location || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  placeholder="City, Country"
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>Email*</Typography>
                <TextField
                  fullWidth
                  name="email"
                  type="email"
                  value={profile.email || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  sx={inputSx}
                />
                <Typography sx={hintSx}>Use the email linked to your Discord so roles are assigned correctly.</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>GitHub*</Typography>
                <TextField
                  fullWidth
                  name="githubProfileUrl"
                  type="url"
                  value={profile.githubProfileUrl || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  placeholder="https://github.com/"
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>Portfolio / Side Project</Typography>
                <TextField
                  fullWidth
                  name="portfolioUrl"
                  type="url"
                  value={profile.portfolioUrl || ''}
                  onChange={handleInputChange}
                  size="small"
                  placeholder="https://"
                  slotProps={{ htmlInput: { maxLength: 2048 } }}
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>LinkedIn</Typography>
                <TextField
                  fullWidth
                  name="linkedinProfileUrl"
                  type="url"
                  value={profile.linkedinProfileUrl || ''}
                  onChange={handleInputChange}
                  size="small"
                  placeholder="https://www.linkedin.com/"
                  slotProps={{ htmlInput: { maxLength: 2048 } }}
                  sx={inputSx}
                />
              </Box>
            </Box>
          </Box>

          {/* Section: Discord (read-only) */}
          <Box sx={sectionSx}>
            <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1rem', mb: 0.5 }}>Discord</Typography>
            <Typography sx={{ color: '#52525b', fontSize: '0.8rem', mb: 3 }}>Synced from your Discord account. These cannot be edited.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="body2" sx={labelSx}>Username</Typography>
                <TextField fullWidth name="discordUsername" value={profile.discordUsername} disabled size="small" sx={inputSx} />
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>Display Name</Typography>
                <TextField fullWidth name="discordGlobalName" value={profile.discordGlobalName} disabled size="small" sx={inputSx} />
              </Box>
            </Box>
          </Box>

          {/* Section: Cohort Details */}
          <Box sx={sectionSx}>
            <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1rem', mb: 3 }}>Cohort Details</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="body2" sx={labelSx}>Hours per week willing to dedicate?*</Typography>
                <TextField
                  fullWidth
                  name="weeklyCohortCommitmentHours"
                  type="number"
                  value={profile.weeklyCohortCommitmentHours ?? ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  slotProps={{ htmlInput: { min: 0 } }}
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>When did you start taking Bitcoin seriously?*</Typography>
                <TextField
                  fullWidth
                  name="firstHeardAboutBitcoinOn"
                  type="date"
                  value={profile.firstHeardAboutBitcoinOn || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  slotProps={{ htmlInput: { max: new Date().toISOString().split('T')[0], style: { colorScheme: 'dark' } } }}
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>Where did you hear about this cohort?*</Typography>
                <TextField
                  fullWidth
                  name="referral"
                  value={profile.referral || ''}
                  onChange={handleInputChange}
                  required
                  size="small"
                  placeholder="e.g. Twitter, friend, blog..."
                  sx={inputSx}
                />
              </Box>
            </Box>
          </Box>

          {/* Section: About You */}
          <Box sx={sectionSx}>
            <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1rem', mb: 3 }}>About You</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body2" sx={labelSx}>How would you describe yourself?*</Typography>
                <TextField
                  fullWidth
                  name="description"
                  value={profile.description || ''}
                  onChange={handleInputChange}
                  required
                  multiline
                  rows={3}
                  placeholder="A short bio..."
                  sx={inputSx}
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
                <Box>
                  <Typography variant="body2" sx={labelSx}>Why is Bitcoin important to you?*</Typography>
                  <TextField
                    fullWidth
                    name="background"
                    value={profile.background || ''}
                    onChange={handleInputChange}
                    required
                    multiline
                    rows={3}
                    sx={inputSx}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={labelSx}>What do you hope to achieve through this Cohort?*</Typography>
                  <TextField
                    fullWidth
                    name="whyBitcoin"
                    value={profile.whyBitcoin || ''}
                    onChange={handleInputChange}
                    required
                    multiline
                    rows={3}
                    sx={inputSx}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Section: Skills & Reading */}
          <Box sx={sectionSx}>
            <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1rem', mb: 3 }}>Skills & Reading</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body2" sx={labelSx}>Skills*</Typography>
                <Autocomplete
                  multiple
                  options={SKILLS_OPTIONS}
                  value={profile.skills}
                  onChange={(_, newValue) => setProfile({ ...profile, skills: newValue })}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...rest } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={option}
                          {...rest}
                          sx={{
                            bgcolor: 'rgba(249,115,22,0.15)',
                            color: '#fb923c',
                            fontWeight: 500,
                            border: '1px solid rgba(249,115,22,0.3)',
                            '& .MuiChip-deleteIcon': { color: 'rgba(249,115,22,0.5)', '&:hover': { color: '#fb923c' } },
                          }}
                        />
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Add a skill..." size="small" />
                  )}
                  slotProps={{
                    paper: {
                      sx: {
                        bgcolor: '#18181b',
                        border: '1px solid #27272a',
                        '& .MuiAutocomplete-option': { color: '#fafafa', '&:hover': { bgcolor: 'rgba(249,115,22,0.15)' } },
                        '& .MuiAutocomplete-option[aria-selected="true"]': { bgcolor: 'rgba(249,115,22,0.1)' },
                      },
                    },
                  }}
                  sx={autocompleteSx}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={labelSx}>Books / resources you've gone through*</Typography>
                <Autocomplete
                  multiple
                  options={BITCOIN_BOOKS_OPTIONS}
                  value={profile.bitcoinBooksRead}
                  onChange={(_, newValue) => setProfile({ ...profile, bitcoinBooksRead: newValue })}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...rest } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          label={option}
                          {...rest}
                          sx={{
                            bgcolor: 'rgba(249,115,22,0.15)',
                            color: '#fb923c',
                            fontWeight: 500,
                            border: '1px solid rgba(249,115,22,0.3)',
                            '& .MuiChip-deleteIcon': { color: 'rgba(249,115,22,0.5)', '&:hover': { color: '#fb923c' } },
                          }}
                        />
                      );
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Add a book..." size="small" />
                  )}
                  slotProps={{
                    paper: {
                      sx: {
                        bgcolor: '#18181b',
                        border: '1px solid #27272a',
                        '& .MuiAutocomplete-option': { color: '#fafafa', '&:hover': { bgcolor: 'rgba(249,115,22,0.15)' } },
                        '& .MuiAutocomplete-option[aria-selected="true"]': { bgcolor: 'rgba(249,115,22,0.1)' },
                      },
                    },
                  }}
                  sx={autocompleteSx}
                />
              </Box>
            </Box>
          </Box>

          {/* Submit */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isUpdating}
              startIcon={isUpdating ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : undefined}
              sx={{
                bgcolor: '#ea580c',
                fontWeight: 600,
                textTransform: 'none',
                px: 5,
                py: 1.5,
                borderRadius: 2.5,
                fontSize: '0.95rem',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#c2410c' },
                '&.Mui-disabled': { bgcolor: '#ea580c', opacity: 0.6, color: '#fff' },
              }}
            >
              {isUpdating ? 'Updating...' : 'Update Profile'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Email Required Dialog */}
      <Dialog
        open={showEmailPopup}
        onClose={() => setShowEmailPopup(false)}
        PaperProps={{
          sx: { bgcolor: '#27272a', borderRadius: 4, border: '1px solid #3f3f46', maxWidth: 440, textAlign: 'center' },
        }}
      >
        <DialogTitle sx={{ pt: 4, pb: 1 }}>
          <Box sx={{ width: 64, height: 64, bgcolor: 'rgba(249,115,22,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <AlertTriangle size={32} color="#f97316" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa' }}>
            Information Required
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
            Please fill in your profile information to join a cohort
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={() => setShowEmailPopup(false)}
            sx={{ color: '#fafafa', bgcolor: '#3f3f46', textTransform: 'none', fontWeight: 600, px: 4, '&:hover': { bgcolor: '#52525b' } }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.show}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, show: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, show: false })}
          severity={notification.type}
          variant="filled"
          sx={{ width: '100%', fontWeight: 500 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentProfileData;
