import { Box, Typography, Chip, Link, Divider } from '@mui/material';
import { User, MapPin, Github, Briefcase, Linkedin, Book, Clock, MessageSquare } from 'lucide-react';

interface ProfileData {
  id?: string;
  email?: string;
  discordUsername?: string;
  discordGlobalName?: string;
  name?: string;
  role?: string;
  description?: string;
  background?: string;
  githubProfileUrl?: string;
  portfolioUrl?: string;
  linkedinProfileUrl?: string;
  skills?: string[];
  firstHeardAboutBitcoinOn?: string;
  bitcoinBooksRead?: string[];
  whyBitcoin?: string;
  weeklyCohortCommitmentHours?: number;
  location?: string;
  referral?: string;
}

interface ProfileDataCardProps {
  profile: ProfileData;
}

export const ProfileDataCard = ({ profile }: ProfileDataCardProps) => {
  return (
    <Box sx={{ mt: 5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, pb: 1.5, borderBottom: '1px solid #27272a' }}>
        <User size={22} color="#fb923c" />
        <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.2rem' }}>Profile Data</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        {/* Basic Info */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          <ProfileRow label="Email" value={profile.email} />
          <ProfileRow label="Discord Username" value={profile.discordUsername} />
          <ProfileRow label="Discord Name" value={profile.discordGlobalName} />
          <ProfileRow label="Role" value={profile.role} />
          {profile.location && (
            <ProfileRow label="Location" value={profile.location} icon={<MapPin size={16} />} />
          )}
          {profile.weeklyCohortCommitmentHours && (
            <ProfileRow
              label="Weekly Commitment"
              value={`${profile.weeklyCohortCommitmentHours} hours`}
              icon={<Clock size={16} />}
            />
          )}
        </Box>

        {/* GitHub */}
        {profile.githubProfileUrl && (
          <>
            <Divider sx={{ borderColor: '#27272a' }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Github size={18} color="#fb923c" />
                <Typography sx={{ fontWeight: 600, color: '#fb923c', fontSize: '0.95rem' }}>GitHub</Typography>
              </Box>
              <Link
                href={profile.githubProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#60a5fa', fontSize: '1rem', '&:hover': { color: '#93c5fd' } }}
              >
                {profile.githubProfileUrl}
              </Link>
            </Box>
          </>
        )}

        {/* Portfolio */}
        {profile.portfolioUrl && (
          <>
            <Divider sx={{ borderColor: '#27272a' }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Briefcase size={18} color="#fb923c" />
                <Typography sx={{ fontWeight: 600, color: '#fb923c', fontSize: '0.95rem' }}>Portfolio</Typography>
              </Box>
              <Link
                href={profile.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#60a5fa', fontSize: '1rem', '&:hover': { color: '#93c5fd' } }}
              >
                {profile.portfolioUrl}
              </Link>
            </Box>
          </>
        )}

        {/* LinkedIn */}
        {profile.linkedinProfileUrl && (
          <>
            <Divider sx={{ borderColor: '#27272a' }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Linkedin size={18} color="#fb923c" />
                <Typography sx={{ fontWeight: 600, color: '#fb923c', fontSize: '0.95rem' }}>LinkedIn</Typography>
              </Box>
              <Link
                href={profile.linkedinProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#60a5fa', fontSize: '1rem', '&:hover': { color: '#93c5fd' } }}
              >
                {profile.linkedinProfileUrl}
              </Link>
            </Box>
          </>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <>
            <Divider sx={{ borderColor: '#27272a' }} />
            <Box>
              <Typography sx={{ fontWeight: 600, color: '#fb923c', mb: 1.5, fontSize: '0.95rem' }}>Skills</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {profile.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    sx={{ bgcolor: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)', fontWeight: 500, fontSize: '0.9rem', height: 32 }}
                  />
                ))}
              </Box>
            </Box>
          </>
        )}

        {/* Bitcoin Books */}
        {profile.bitcoinBooksRead && profile.bitcoinBooksRead.length > 0 && (
          <>
            <Divider sx={{ borderColor: '#27272a' }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Book size={18} color="#fb923c" />
                <Typography sx={{ fontWeight: 600, color: '#fb923c', fontSize: '0.95rem' }}>Bitcoin Books Read</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {profile.bitcoinBooksRead.map((book, index) => (
                  <Chip
                    key={index}
                    label={book}
                    sx={{ bgcolor: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)', fontWeight: 500, fontSize: '0.9rem', height: 32 }}
                  />
                ))}
              </Box>
            </Box>
          </>
        )}

        {/* Description & Background */}
        {(profile.description || profile.background) && (
          <>
            <Divider sx={{ borderColor: '#27272a' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {profile.description && (
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#fb923c', mb: 0.5, fontSize: '0.95rem' }}>Description</Typography>
                  <Typography sx={{ color: '#d4d4d8', fontSize: '0.95rem', lineHeight: 1.7 }}>{profile.description}</Typography>
                </Box>
              )}
              {profile.background && (
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#fb923c', mb: 0.5, fontSize: '0.95rem' }}>Background</Typography>
                  <Typography sx={{ color: '#d4d4d8', fontSize: '0.95rem', lineHeight: 1.7 }}>{profile.background}</Typography>
                </Box>
              )}
            </Box>
          </>
        )}

        {/* Why Bitcoin */}
        {profile.whyBitcoin && (
          <>
            <Divider sx={{ borderColor: '#27272a' }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <MessageSquare size={18} color="#fb923c" />
                <Typography sx={{ fontWeight: 600, color: '#fb923c', fontSize: '0.95rem' }}>Why Bitcoin?</Typography>
              </Box>
              <Typography sx={{ color: '#d4d4d8', fontSize: '0.95rem', lineHeight: 1.7 }}>{profile.whyBitcoin}</Typography>
            </Box>
          </>
        )}

        {/* Additional Info */}
        {(profile.firstHeardAboutBitcoinOn || profile.referral) && (
          <>
            <Divider sx={{ borderColor: '#27272a' }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              {profile.firstHeardAboutBitcoinOn && (
                <ProfileRow label="First Heard About Bitcoin" value={profile.firstHeardAboutBitcoinOn} />
              )}
              {profile.referral && (
                <ProfileRow label="Referral" value={profile.referral} />
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

const ProfileRow = ({
  label,
  value,
  icon
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
}) => {
  if (!value) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        {icon && <Box sx={{ color: '#fb923c', display: 'flex' }}>{icon}</Box>}
        <Typography sx={{ fontWeight: 600, color: '#fb923c', fontSize: '0.85rem' }}>{label}</Typography>
      </Box>
      <Typography sx={{ color: '#d4d4d8', fontSize: '1rem' }}>{value}</Typography>
    </Box>
  );
};
