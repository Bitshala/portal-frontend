import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Link,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Info,
  Link2,
  FileText,
  ClipboardList,
  ExternalLink,
  Presentation,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { WeekContent, BonusQuestion, RichQuestion } from '../../types/instructions';
import { getAuthTokenFromStorage } from '../../services/authService';

const isImageFile = (filename: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);

const Attachment: React.FC<{ filename: string; url: string }> = ({ filename, url }) => {
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
        sx={{ maxWidth: '100%', borderRadius: 2, border: '1px solid #3f3f46', display: 'block' }}
      />
    ) : null;
  }

  return (
    <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ color: '#60a5fa', fontSize: '0.9rem' }}>
      {filename}
    </Link>
  );
};

interface InstructionsLayoutProps {
  cohortName: string;
  cohortType: 'MASTERING_BITCOIN' | 'LEARNING_BITCOIN_FROM_COMMAND_LINE' | 'MASTERING_LIGHTNING_NETWORK' | 'BITCOIN_PROTOCOL_DEVELOPMENT';
  weeklyContent: WeekContent[];
  activeWeek: number | 'links' | 'exercises';
  setActiveWeek: (week: number | 'links' | 'exercises') => void;
  canViewBonusQuestions: boolean;
  seasonNumber?: number;
}

const InstructionsLayout: React.FC<InstructionsLayoutProps> = ({
  cohortName,
  cohortType,
  weeklyContent,
  activeWeek,
  setActiveWeek,
  canViewBonusQuestions,
  seasonNumber,
}) => {
  const navigate = useNavigate();
  const [showGDModal, setShowGDModal] = useState(false);
  const [gdSlideIndex, setGdSlideIndex] = useState(0);

  const currentWeekData = weeklyContent.find(w => w.week === activeWeek);

  const allSlides = useMemo(() => {
    if (!currentWeekData) return [];
    const slides: { text: string; isBonus: boolean; image?: string; attachments?: { filename: string; url: string }[] }[] = [];
    currentWeekData.gdQuestions.forEach(q => {
      if (typeof q === 'string') {
        slides.push({ text: q, isBonus: false });
      } else {
        slides.push({ text: (q as RichQuestion).text, isBonus: false, attachments: (q as RichQuestion).attachments });
      }
    });
    if (canViewBonusQuestions && currentWeekData.bonusQuestions) {
      currentWeekData.bonusQuestions.forEach(q => {
        if (typeof q === 'string') {
          slides.push({ text: q, isBonus: true });
        } else if ('question' in q) {
          slides.push({ text: (q as BonusQuestion).question, isBonus: true, image: (q as BonusQuestion).image });
        } else {
          slides.push({ text: (q as RichQuestion).text, isBonus: true, attachments: (q as RichQuestion).attachments });
        }
      });
    }
    return slides;
  }, [currentWeekData, canViewBonusQuestions]);

  const handleOpenGDModal = useCallback(() => {
    setGdSlideIndex(0);
    setShowGDModal(true);
  }, []);

  const handleCloseGDModal = useCallback(() => {
    setShowGDModal(false);
  }, []);

  const getAssignmentLink = (week: WeekContent): string | undefined => {
    // Prefer classroomUrl from API if available
    if (week.classroomUrl) return week.classroomUrl;
    // Fall back to static assignmentLinks
    if (!week.assignmentLinks) return undefined;
    if (seasonNumber && week.assignmentLinks[seasonNumber]) {
      return week.assignmentLinks[seasonNumber];
    }
    const seasons = Object.keys(week.assignmentLinks).map(Number);
    if (seasons.length === 0) return undefined;
    const latestSeason = Math.max(...seasons);
    return week.assignmentLinks[latestSeason];
  };

  const activeChipSx = {
    bgcolor: '#ea580c',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    height: 34,
    cursor: 'pointer',
    '& .MuiChip-icon': { color: '#fff' },
    '&:hover': { bgcolor: '#c2410c' },
  };

  const inactiveChipSx = {
    bgcolor: '#27272a',
    color: '#a1a1aa',
    fontWeight: 500,
    fontSize: '0.9rem',
    height: 34,
    cursor: 'pointer',
    border: '1px solid #3f3f46',
    '& .MuiChip-icon': { color: '#a1a1aa' },
    '&:hover': { bgcolor: '#3f3f46', color: '#e4e4e7' },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fafafa' }}>
      {/* Top Header */}
      <Box sx={{ borderBottom: '1px solid #27272a', px: { xs: 2, sm: 3, md: 4 }, py: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {cohortName}
        </Typography>
      </Box>

      {/* Navigation Bar */}
      <Box
        sx={{
          borderBottom: '1px solid #27272a',
          px: { xs: 2, sm: 3, md: 4 },
          py: 1.5,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#3f3f46', borderRadius: 2 },
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', minWidth: 'max-content' }}>
          {/* General Instructions */}
          <Chip
            icon={<Info size={16} />}
            label="General Instructions"
            onClick={() => navigate('/general-instructions')}
            sx={inactiveChipSx}
          />

          {/* Links */}
          <Chip
            icon={<Link2 size={16} />}
            label="Links"
            onClick={() => setActiveWeek('links')}
            sx={activeWeek === 'links' ? activeChipSx : inactiveChipSx}
          />

          {/* Exercises - Only for Lightning Network */}
          {cohortType === 'MASTERING_LIGHTNING_NETWORK' && (
            <Chip
              icon={<ClipboardList size={16} />}
              label="Exercises"
              onClick={() => setActiveWeek('exercises')}
              sx={activeWeek === 'exercises' ? activeChipSx : inactiveChipSx}
            />
          )}

          {/* Week Chips */}
          {weeklyContent.map((week) => (
            <Chip
              key={week.week}
              label={`Week ${week.week}`}
              onClick={() => setActiveWeek(week.week)}
              sx={activeWeek === week.week ? activeChipSx : inactiveChipSx}
            />
          ))}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 6 }, py: { xs: 3, md: 5 }, maxWidth: 900, mx: 'auto' }}>
        {activeWeek === 'exercises' ? (
          /* Exercises Content */
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Lightning Network Exercises
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { num: 1, exerciseWeek: 1, title: 'First Node Setup and Invoice Generation', concepts: 'Node initialization, wallet funding, invoice creation', problem: 'Set up and run your first C-Lightning (Core Lightning) node. Once the node is operational, fund it with some test Bitcoin (on regtest or testnet). Using the CLN RPC interface, create a Lightning invoice for 50,000 satoshis with a description "Coffee Payment" and a 1-hour expiry.', output: ['A running Lightning node with a funded on-chain wallet', 'A valid Lightning invoice (BOLT11 format) that can be decoded to show the amount, description, and expiry time', 'Verification that the invoice was generated by your node'] },
                { num: 2, exerciseWeek: 3, title: 'Peer Connection and Channel Establishment', concepts: 'Node discovery, peer connection, channel opening, channel capacity', problem: 'Create and run two separate Lightning nodes (Alice and Bob). Connect them as peers using their respective node IDs and network addresses. Once connected, have Alice open a payment channel to Bob with a capacity of 500,000 satoshis. Verify that the channel is active and check the channel state on both nodes.', output: ['Two running Lightning nodes that recognize each other as peers', 'An active payment channel between Alice and Bob', 'Channel details showing: capacity, local/remote balance, channel ID, and state (CHANNELD_NORMAL)'] },
                { num: 3, exerciseWeek: 5, title: 'Multi-Hop Payment Routing', concepts: 'Network topology, pathfinding, multi-hop payments, routing fees', problem: 'Building on Exercise 2, create a third node (Carol). Establish a network topology where: Alice has a channel with Bob (500k sats), and Bob has a channel with Carol (300k sats). Carol should generate an invoice for 100,000 satoshis. Alice should pay this invoice, which will require the payment to route through Bob as an intermediate hop. Monitor and verify that the payment successfully traverses the network.', output: ['A 3-node network with appropriate channel topology (Alice\u2192Bob\u2192Carol)', 'Successful payment from Alice to Carol via Bob', 'Proof of payment (preimage) received by Alice', 'Updated channel balances reflecting the routed payment and routing fees collected by Bob'] },
                { num: 4, exerciseWeek: 7, title: 'Circular Rebalancing', concepts: 'Channel liquidity, circular payments, channel balance management', problem: 'Using your 3-node network from Exercise 3, create a circular topology by opening a new channel from Carol back to Alice with 400,000 satoshis capacity. Now you have: Alice\u2192Bob, Bob\u2192Carol, and Carol\u2192Alice. Execute a circular rebalancing payment where Alice pays herself 150,000 satoshis by routing the payment through Bob and Carol (Alice\u2192Bob\u2192Carol\u2192Alice). Verify that the payment completes successfully and observe how the balances shift in each channel.', output: ['A circular network topology with three bidirectional channels (Alice\u2194Bob\u2194Carol\u2194Alice)', 'Successful self-payment from Alice to Alice via the circular route', 'Before and after channel balance snapshots for all three channels', 'Proof that liquidity has been redistributed: Alice\'s outbound capacity increased on the Alice\u2192Bob channel, while her inbound capacity decreased on the Carol\u2192Alice channel'] },
              ].map((ex) => {
                const weekData = weeklyContent.find(w => w.week === ex.exerciseWeek);
                const link = weekData ? getAssignmentLink(weekData) : undefined;
                return (
                  <Paper key={ex.num} elevation={0} sx={{ bgcolor: 'rgba(39,39,42,0.5)', border: '1px solid #3f3f46', borderRadius: 2, p: { xs: 3, md: 4 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fb923c', mb: 2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                      Exercise {ex.num}: {ex.title}
                    </Typography>
                    {link && (
                      <Link href={link} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2, fontSize: '1rem' }}>
                        Exercise {ex.num} Assignment <ExternalLink size={14} />
                      </Link>
                    )}
                    <Typography variant="body2" sx={{ color: '#d4d4d8', mb: 2 }}>
                      <strong style={{ color: '#fafafa' }}>Concepts:</strong> {ex.concepts}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fafafa', fontWeight: 600, mb: 1 }}>Problem Statement:</Typography>
                    <Typography variant="body2" sx={{ color: '#d4d4d8', mb: 2, lineHeight: 1.7 }}>{ex.problem}</Typography>
                    <Typography variant="body2" sx={{ color: '#fafafa', fontWeight: 600, mb: 1 }}>Expected Output:</Typography>
                    <Box component="ul" sx={{ pl: 3, m: 0 }}>
                      {ex.output.map((item, i) => (
                        <Typography key={i} component="li" variant="body2" sx={{ color: '#d4d4d8', mb: 0.5, lineHeight: 1.6 }}>{item}</Typography>
                      ))}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        ) : activeWeek === 'links' ? (
          /* Links Content */
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Frequently Accessed Links
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Wheel of Names', url: 'https://wheelofnames.com/' },
                { label: 'MultiBuzz', url: 'https://www.multibuzz.app/' },
              ].map((link) => (
                <Link key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                  {link.label} <ExternalLink size={16} />
                </Link>
              ))}

              {canViewBonusQuestions && cohortType === 'LEARNING_BITCOIN_FROM_COMMAND_LINE' && (
                <>
                  <Link href="https://docs.google.com/document/d/1YXsW3gRVbBxBEAAcI84W3KCFBbevzVXUUznH8w2XohM/preview" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                    lbtcl-playbook <ExternalLink size={16} />
                  </Link>
                  <Link href="https://gist.github.com/rajarshimaitra/f83eaf3295b88ac180a965b3daab4d8a" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                    lbtcl-bonus-questions <ExternalLink size={16} />
                  </Link>
                  <Link href="https://github.com/Bitshala/LBTCL" target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                    lbtcl-main-repo <ExternalLink size={16} />
                  </Link>
                </>
              )}
            </Box>
          </Box>
        ) : (
          /* Week Questions Content */
          <>
            {weeklyContent.find(week => week.week === activeWeek) && (() => {
              const currentWeek = weeklyContent.find(week => week.week === activeWeek)!;
              const assignmentLink = getAssignmentLink(currentWeek);

              // Parse reading material and activity from content
              const sections = (currentWeek.content || '').split('## ').filter(s => s.trim());
              const readingSection = sections.find(s => s.trim().startsWith('Reading Material'));
              const activitySection = sections.find(s => s.trim().startsWith('Activity'));

              const readingLinks = readingSection
                ? readingSection.split('\n').filter(line => line.match(/\[([^\]]+)\]\(([^)]+)\)/)).map(line => {
                    const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
                    return match ? { label: match[1], url: match[2] } : null;
                  }).filter(Boolean) as { label: string; url: string }[]
                : [];

              const activityContent = activitySection
                ? activitySection.split('\n').slice(1).join('\n').trim()
                : null;

              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {/* Title + Present Button */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.5rem', md: '2rem' } }}>
                      {currentWeek.title}
                    </Typography>
                    {canViewBonusQuestions && currentWeek.gdQuestions.length > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Presentation size={16} />}
                        onClick={handleOpenGDModal}
                        sx={{
                          bgcolor: '#fb923c',
                          '&:hover': { bgcolor: '#f97316' },
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          boxShadow: 'none',
                          borderRadius: 2,
                          px: 2,
                        }}
                      >
                        Present GD Questions
                      </Button>
                    )}
                  </Box>

                  {/* Assignment */}
                  {(assignmentLink || currentWeek.classroomInviteLink) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#a1a1aa', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Assignment
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {assignmentLink && (
                          <Chip
                            label={`Week ${activeWeek} Assignment`}
                            component="a"
                            href={assignmentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(96,165,250,0.12)',
                              color: '#93c5fd',
                              border: '1px solid rgba(96,165,250,0.25)',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(96,165,250,0.2)', color: '#bfdbfe' },
                            }}
                          />
                        )}
                        {currentWeek.classroomInviteLink && (
                          <Chip
                            label="Classroom Invite"
                            component="a"
                            href={currentWeek.classroomInviteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(74,222,128,0.12)',
                              color: '#86efac',
                              border: '1px solid rgba(74,222,128,0.25)',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(74,222,128,0.2)', color: '#bbf7d0' },
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Reading Material */}
                  {readingLinks.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#a1a1aa', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Reading Material
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {readingLinks.map((link, i) => (
                          <Chip
                            key={i}
                            label={link.label}
                            component="a"
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(251,146,60,0.1)',
                              color: '#fdba74',
                              border: '1px solid rgba(251,146,60,0.2)',
                              fontWeight: 500,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(251,146,60,0.18)', color: '#fed7aa' },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Questions */}
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    List of Questions
                  </Typography>

                  {/* Group Round */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa', mb: 3 }}>Group Round</Typography>
                    <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {currentWeek.gdQuestions.map((question, index) => {
                        const text = typeof question === 'string' ? question : question.text;
                        const attachments = typeof question === 'string' ? [] : question.attachments;
                        return (
                          <Box key={index} component="li">
                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                              <Typography sx={{ color: '#fb923c', fontWeight: 600, mr: 1.5, mt: 0.1, minWidth: 24, fontSize: '1.1rem' }}>
                                {index + 1}.
                              </Typography>
                              <Typography sx={{ color: '#e4e4e7', lineHeight: 1.7, fontSize: '1.1rem' }}>
                                {text}
                              </Typography>
                            </Box>
                            {attachments.length > 0 && (
                              <Box sx={{ ml: 4.5, mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {attachments.map((a) => <Attachment key={a.filename} {...a} />)}
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  {/* Bonus Round */}
                  {canViewBonusQuestions && currentWeek.bonusQuestions && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa', mb: 3 }}>Bonus Round</Typography>
                      <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {currentWeek.bonusQuestions.map((item, index) => {
                          const isRich = typeof item !== 'string' && 'text' in item;
                          const isBonusQuestion = typeof item !== 'string' && 'question' in item;
                          const question = typeof item === 'string' ? item : isRich ? (item as RichQuestion).text : (item as BonusQuestion).question;
                          const image = isBonusQuestion ? (item as BonusQuestion).image : undefined;
                          const attachments = isRich ? (item as RichQuestion).attachments : [];
                          return (
                            <Box key={index} component="li">
                              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Typography sx={{ color: '#60a5fa', fontWeight: 600, mr: 1.5, mt: 0.1, minWidth: 24, fontSize: '1.1rem' }}>
                                  {index + 1}.
                                </Typography>
                                <Typography sx={{ color: '#e4e4e7', lineHeight: 1.7, fontSize: '1.1rem', whiteSpace: 'pre-line' }}>
                                  {question}
                                </Typography>
                              </Box>
                              {image && (
                                <Box sx={{ mt: 1.5, ml: 4 }}>
                                  <Box component="img" src={image} alt={`Question ${index + 1} reference`} sx={{ maxWidth: '100%', borderRadius: 2, border: '1px solid #3f3f46' }} />
                                </Box>
                              )}
                              {attachments.length > 0 && (
                                <Box sx={{ ml: 4.5, mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  {attachments.map((a) => <Attachment key={a.filename} {...a} />)}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {/* Activity */}
                  {activityContent && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#60a5fa', mb: 2 }}>Activity</Typography>
                      <Typography sx={{ color: '#e4e4e7', fontSize: '1.1rem', lineHeight: 1.7 }}>
                        {activityContent}
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </>
        )}
      </Box>

      {/* GD Questions PPT Modal — Admin/TA only */}
      {canViewBonusQuestions && (
        <Dialog
          open={showGDModal}
          onClose={handleCloseGDModal}
          maxWidth="lg"
          fullWidth
          slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.75)' } },
          }}
          PaperProps={{
            sx: {
              bgcolor: '#111113',
              backgroundImage: 'none',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
              minHeight: 520,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              setGdSlideIndex(prev => Math.min(prev + 1, allSlides.length - 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              setGdSlideIndex(prev => Math.max(prev - 1, 0));
            }
          }}
        >
          {/* Header */}
          <Box sx={{ px: 3.5, pt: 3, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1.6rem', letterSpacing: '-0.01em' }}>
                GD Questions &mdash; Week {activeWeek}
              </Typography>
              <Typography sx={{ color: '#71717a', fontSize: '0.95rem', mt: 0.5 }}>
                {allSlides.length > 0
                  ? `${currentWeekData?.gdQuestions.length ?? 0} questions${(currentWeekData?.bonusQuestions?.length ?? 0) > 0 ? ` + ${currentWeekData!.bonusQuestions!.length} bonus` : ''}`
                  : 'No questions available for this week'}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseGDModal} size="small" sx={{ color: '#52525b', '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.06)' } }}>
              <X size={18} />
            </IconButton>
          </Box>

          {/* Slide Body */}
          <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: { xs: 3, sm: 5 }, py: 4 }}>
            {allSlides.length > 0 ? (
              <Box sx={{ width: '100%', textAlign: 'center' }}>
                {/* Bonus badge */}
                {allSlides[gdSlideIndex]?.isBonus && (
                  <Box sx={{
                    display: 'inline-block',
                    bgcolor: 'rgba(59,130,246,0.15)',
                    color: '#60a5fa',
                    px: 2, py: 0.5,
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    mb: 2,
                  }}>
                    Bonus Question
                  </Box>
                )}

                {/* Question number */}
                <Typography sx={{
                  color: allSlides[gdSlideIndex]?.isBonus ? '#60a5fa' : '#f97316',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  mb: 2,
                }}>
                  {allSlides[gdSlideIndex]?.isBonus
                    ? `Bonus Q${gdSlideIndex - (currentWeekData?.gdQuestions.length ?? 0) + 1}.`
                    : `Q${gdSlideIndex + 1}.`}
                </Typography>

                {/* Question text */}
                <Typography sx={{
                  color: '#fafafa',
                  fontSize: { xs: '1.3rem', sm: '1.65rem' },
                  fontWeight: 400,
                  lineHeight: 1.7,
                  maxWidth: 800,
                  mx: 'auto',
                  whiteSpace: 'pre-line',
                }}>
                  {allSlides[gdSlideIndex]?.text}
                </Typography>

                {/* Bonus image if present */}
                {allSlides[gdSlideIndex]?.image && (
                  <Box
                    component="img"
                    src={allSlides[gdSlideIndex].image}
                    alt="Bonus question illustration"
                    sx={{
                      mt: 3,
                      maxWidth: '100%',
                      maxHeight: 300,
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  />
                )}

                {/* Attachments if present */}
                {(allSlides[gdSlideIndex]?.attachments?.length ?? 0) > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    {allSlides[gdSlideIndex].attachments!.map((a) => <Attachment key={a.filename} {...a} />)}
                  </Box>
                )}
              </Box>
            ) : (
              <Typography sx={{ color: '#52525b', fontSize: '1.1rem' }}>
                No questions available for this week.
              </Typography>
            )}
          </DialogContent>

          {/* Footer Navigation */}
          {allSlides.length > 0 && (
            <DialogActions sx={{
              px: 3.5, pb: 3, pt: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <Button
                onClick={() => setGdSlideIndex(prev => Math.max(prev - 1, 0))}
                disabled={gdSlideIndex === 0}
                startIcon={<ChevronLeft size={16} />}
                sx={{
                  color: '#a1a1aa',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.04)' },
                  '&.Mui-disabled': { color: '#3f3f46' },
                }}
              >
                Prev
              </Button>

              <Typography sx={{ color: '#71717a', fontSize: '1rem', fontWeight: 500 }}>
                {gdSlideIndex + 1} / {allSlides.length}
              </Typography>

              <Button
                onClick={() => setGdSlideIndex(prev => Math.min(prev + 1, allSlides.length - 1))}
                disabled={gdSlideIndex === allSlides.length - 1}
                endIcon={<ChevronRight size={16} />}
                sx={{
                  color: '#a1a1aa',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.04)' },
                  '&.Mui-disabled': { color: '#3f3f46' },
                }}
              >
                Next
              </Button>
            </DialogActions>
          )}
        </Dialog>
      )}
    </Box>
  );
};

export default InstructionsLayout;
