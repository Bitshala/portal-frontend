import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Menu,
  MenuItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Divider,
  Pagination,
} from '@mui/material';
import { MessageSquare, X } from 'lucide-react';
import { useAllFeedback, useFeedbackByCohort } from '../../hooks/feedbackHooks';
import { useCohorts } from '../../hooks/cohortHooks';
import { useUserById } from '../../hooks/userHooks';
import FeedbackRatingCharts from '../../components/FeedbackRatingCharts';
import { cohortTypeToName } from '../../helpers/cohortHelpers';
import type { GetCohortResponseDto, GetFeedbackResponseDto } from '../../types/api';
import { CohortComponent, ComponentRating, type CohortType } from '../../types/enums';

const COMPONENT_LABELS: Record<CohortComponent, string> = {
  [CohortComponent.SESSION_INSTRUCTIONS]: 'Session Instructions',
  [CohortComponent.STUDY_MATERIAL]: 'Study Material',
  [CohortComponent.GROUP_DISCUSSIONS]: 'Group Discussions',
  [CohortComponent.LOUNGE_DISCUSSIONS]: 'Lounge Discussions',
  [CohortComponent.DEPUTY]: 'TA',
  [CohortComponent.TEACHING_ASSISTANTS]: 'Teaching Assistants',
  [CohortComponent.BITSHALA_CLUBS]: 'Bitshala Clubs',
  [CohortComponent.BITDEV_MEETUPS]: 'Bitdev Meetups',
  [CohortComponent.BITSPACE]: 'Bitspace',
  [CohortComponent.FELLOWSHIPS]: 'Fellowships',
};

const RATING_LABELS: Record<ComponentRating, string> = {
  [ComponentRating.NOT_AT_ALL]: 'Not at all',
  [ComponentRating.SOMEWHAT]: 'Somewhat',
  [ComponentRating.HELPFUL]: 'Helpful',
  [ComponentRating.VERY_HELPFUL]: 'Very Helpful',
};

const RATING_COLOR: Record<ComponentRating, string> = {
  [ComponentRating.NOT_AT_ALL]: '#f87171',
  [ComponentRating.SOMEWHAT]: '#facc15',
  [ComponentRating.HELPFUL]: '#60a5fa',
  [ComponentRating.VERY_HELPFUL]: '#4ade80',
};

const PAGE_SIZE = 20;

const headerCellSx = {
  color: '#71717a',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid rgba(63,63,70,0.5)',
  py: 2,
  px: 3,
  whiteSpace: 'nowrap' as const,
};

const bodyCellSx = {
  borderBottom: '1px solid rgba(63,63,70,0.3)',
  py: 2.5,
  px: 3,
};

const sectionLabelSx = {
  fontSize: '0.7rem',
  fontWeight: 700,
  color: '#71717a',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.6,
};

const INTEREST_COLORS = {
  opportunity: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  fellowship: { bg: 'rgba(249,115,22,0.1)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
};

const cohortLabel = (cohort: { displayName: string; season: number }): string =>
  `${cohort.displayName} — Season ${cohort.season}`;

const getFeedbackSnippet = (feedback: GetFeedbackResponseDto): string | null =>
  feedback.testimonial || feedback.expectations || feedback.improvements || feedback.idealProject || null;

const DiscordUsernameCell = ({ userId, fallback }: { userId: string; fallback: string }) => {
  const { data: user, isLoading } = useUserById(userId);

  if (isLoading) {
    return <CircularProgress size={14} sx={{ color: '#71717a' }} />;
  }

  return (
    <Typography variant="body2" sx={{ color: '#fafafa', fontWeight: 500 }}>
      {user?.discordUsername ?? fallback}
    </Typography>
  );
};

const FeedbackSummaryCell = ({ feedback }: { feedback: GetFeedbackResponseDto }) => {
  const snippet = getFeedbackSnippet(feedback);

  return (
    <Typography
      variant="body2"
      sx={{
        color: snippet ? '#a1a1aa' : '#52525b',
        maxWidth: 420,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        fontStyle: snippet ? 'normal' : 'italic',
      }}
    >
      {snippet ?? 'No written feedback'}
    </Typography>
  );
};

const InterestSection = ({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: keyof typeof INTEREST_COLORS;
}) => {
  if (items.length === 0) return null;
  const { bg, text, border } = INTEREST_COLORS[variant];

  return (
    <Box>
      <Typography sx={{ ...sectionLabelSx, mb: 1 }}>{title}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {items.map((item) => (
          <Chip
            key={item}
            label={item.replace(/_/g, ' ')}
            size="small"
            sx={{ bgcolor: bg, color: text, border: `1px solid ${border}` }}
          />
        ))}
      </Box>
    </Box>
  );
};

const FeedbackDetailDialog = ({
  feedback,
  onClose,
}: {
  feedback: GetFeedbackResponseDto;
  onClose: () => void;
}) => (
  <Dialog
    open
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    PaperProps={{ sx: { bgcolor: '#1c1c1f', border: '1px solid #27272a', borderRadius: 3 } }}
  >
    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa' }}>
          {feedback.userName ?? feedback.userEmail ?? 'Anonymous'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#71717a', mt: 0.25 }}>
          {feedback.userEmail}
        </Typography>
      </Box>
      <IconButton onClick={onClose} size="small" sx={{ color: '#a1a1aa', '&:hover': { color: '#fafafa' } }}>
        <X size={20} />
      </IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ borderColor: '#27272a' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {feedback.componentRatings && Object.keys(feedback.componentRatings).length > 0 && (
          <Box>
            <Typography sx={{ ...sectionLabelSx, mb: 1.5 }}>
              Component Ratings
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {(Object.entries(feedback.componentRatings) as [CohortComponent, ComponentRating][]).map(([comp, rating]) => (
                <Box
                  key={comp}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid rgba(63,63,70,0.5)' }}
                >
                  <Typography variant="body2" sx={{ color: '#d4d4d8' }}>{COMPONENT_LABELS[comp] ?? comp}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: RATING_COLOR[rating] ?? '#d4d4d8' }}>
                    {RATING_LABELS[rating] ?? rating}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {[
          { label: 'Expectations', value: feedback.expectations },
          { label: 'Improvements', value: feedback.improvements },
          { label: 'Ideal Project', value: feedback.idealProject },
          { label: 'Testimonial', value: feedback.testimonial },
        ].map(({ label, value }) =>
          value ? (
            <Box key={label}>
              <Typography sx={{ ...sectionLabelSx, mb: 0.5 }}>
                {label}
              </Typography>
              <Typography variant="body2" sx={{ color: '#d4d4d8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {value}
              </Typography>
            </Box>
          ) : null
        )}

        <InterestSection title="Opportunity Interests" items={feedback.opportunityInterests} variant="opportunity" />
        <InterestSection title="Fellowship Interests" items={feedback.fellowshipInterests} variant="fellowship" />

        <Divider sx={{ borderColor: '#27272a' }} />
        <Typography sx={{ color: '#52525b', fontSize: '0.75rem' }}>
          Submitted {new Date(feedback.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>
    </DialogContent>
  </Dialog>
);

const FeedbackAdmin: React.FC = () => {
  const { data: cohortsData } = useCohorts({ page: 0, pageSize: 100 });
  const [selectedCohort, setSelectedCohort] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<GetFeedbackResponseDto | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [submenuAnchor, setSubmenuAnchor] = useState<null | HTMLElement>(null);
  const [activeType, setActiveType] = useState<CohortType | null>(null);

  const cohortNameMap = useMemo(() => {
    const map = new Map<string, string>();
    cohortsData?.records.forEach((cohort) => map.set(cohort.id, cohortLabel(cohort)));
    return map;
  }, [cohortsData]);

  const cohortsByType = useMemo(() => {
    const map = new Map<CohortType, GetCohortResponseDto[]>();
    for (const cohort of cohortsData?.records ?? []) {
      const list = map.get(cohort.type) ?? [];
      list.push(cohort);
      map.set(cohort.type, list);
    }
    return Array.from(map.entries())
      .map(([type, seasons]) => ({
        type,
        name: cohortTypeToName(type),
        seasons: [...seasons].sort((a, b) => b.season - a.season),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cohortsData]);

  const activeSeasons = useMemo(
    () => cohortsByType.find((group) => group.type === activeType)?.seasons ?? [],
    [cohortsByType, activeType],
  );

  const allQuery = useAllFeedback({ page, pageSize: PAGE_SIZE }, { enabled: !selectedCohort });
  const cohortQuery = useFeedbackByCohort(
    { cohortId: selectedCohort, query: { page, pageSize: PAGE_SIZE } },
    { enabled: !!selectedCohort }
  );

  const { data, isLoading } = selectedCohort ? cohortQuery : allQuery;
  const records = data?.records ?? [];
  const total = data?.totalRecords ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const selectedLabel = selectedCohort
    ? (cohortNameMap.get(selectedCohort) ?? 'Selected cohort')
    : 'All Cohorts';

  const closeMenus = () => {
    setMenuAnchor(null);
    setSubmenuAnchor(null);
    setActiveType(null);
  };

  const handleCohortChange = (cohortId: string) => {
    setSelectedCohort(cohortId);
    setPage(0);
    closeMenus();
  };

  const openSubmenu = (event: React.MouseEvent<HTMLElement>, type: CohortType) => {
    setSubmenuAnchor(event.currentTarget);
    setActiveType(type);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <MessageSquare size={28} color="#fb923c" />
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#fafafa', fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Feedback
          </Typography>
        </Box>
        <Typography sx={{ color: '#71717a', fontSize: '0.9rem' }}>
          View all cohort feedback submissions
        </Typography>
      </Box>

      <FeedbackRatingCharts cohorts={cohortsData?.records ?? []} />

      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          endIcon={
            <Typography component="span" sx={{ fontSize: '0.7rem', color: '#a1a1aa', lineHeight: 1 }}>
              ▾
            </Typography>
          }
          sx={{
            minWidth: 280,
            justifyContent: 'space-between',
            textTransform: 'none',
            bgcolor: '#1c1c1f',
            color: '#fafafa',
            borderColor: '#3f3f46',
            px: 1.75,
            py: 0.85,
            '&:hover': { borderColor: '#52525b', bgcolor: '#1c1c1f' },
          }}
        >
          <Typography noWrap sx={{ color: '#fafafa', fontSize: '0.875rem' }}>
            {selectedLabel}
          </Typography>
        </Button>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={closeMenus}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={{
            sx: {
              bgcolor: '#1c1c1f',
              border: '1px solid #27272a',
              mt: 0.5,
              minWidth: 280,
            },
          }}
        >
          <MenuItem
            selected={!selectedCohort}
            onClick={() => handleCohortChange('')}
            sx={{ color: '#fafafa' }}
          >
            All Cohorts
          </MenuItem>
          <Divider sx={{ borderColor: '#27272a', my: 0.5 }} />
          {cohortsByType.map((group) => {
            const isGroupSelected = group.seasons.some((s) => s.id === selectedCohort);
            return (
              <MenuItem
                key={group.type}
                onMouseEnter={(e) => openSubmenu(e, group.type)}
                onClick={(e) => openSubmenu(e, group.type)}
                selected={isGroupSelected || activeType === group.type}
                sx={{
                  color: '#fafafa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                  '&.Mui-selected': { bgcolor: 'rgba(249,115,22,0.12)' },
                  '&.Mui-selected:hover': { bgcolor: 'rgba(249,115,22,0.18)' },
                }}
              >
                <ListItemText
                  primary={group.name}
                  primaryTypographyProps={{ fontSize: '0.875rem', noWrap: true }}
                />
                <Typography component="span" sx={{ color: '#71717a', fontSize: '0.85rem' }}>
                  ›
                </Typography>
              </MenuItem>
            );
          })}
        </Menu>

        <Menu
          anchorEl={submenuAnchor}
          open={Boolean(submenuAnchor) && Boolean(activeType)}
          onClose={() => {
            setSubmenuAnchor(null);
            setActiveType(null);
          }}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          disableAutoFocusItem
          MenuListProps={{
            onMouseLeave: () => {
              setSubmenuAnchor(null);
              setActiveType(null);
            },
          }}
          PaperProps={{
            sx: {
              bgcolor: '#1c1c1f',
              border: '1px solid #27272a',
              ml: 0.5,
              minWidth: 160,
            },
          }}
        >
          {activeSeasons.map((cohort) => (
            <MenuItem
              key={cohort.id}
              selected={selectedCohort === cohort.id}
              onClick={() => handleCohortChange(cohort.id)}
              sx={{
                color: '#fafafa',
                '&.Mui-selected': { bgcolor: 'rgba(249,115,22,0.12)', color: '#fb923c' },
                '&.Mui-selected:hover': { bgcolor: 'rgba(249,115,22,0.18)' },
              }}
            >
              Season {cohort.season}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 10 }}>
          <CircularProgress size={36} sx={{ color: '#f97316' }} />
          <Typography variant="body2" sx={{ color: '#71717a' }}>Loading feedback...</Typography>
        </Box>
      ) : records.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <Typography variant="body2" sx={{ color: '#71717a' }}>
            No feedback submissions yet{selectedCohort ? ' for this cohort' : ''}.
          </Typography>
        </Box>
      ) : (
        <>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.85rem', mb: 2 }}>
            {total} submission{total !== 1 ? 's' : ''}
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Discord Username</TableCell>
                  <TableCell sx={headerCellSx}>Cohort</TableCell>
                  <TableCell sx={headerCellSx}>Feedback</TableCell>
                  <TableCell sx={{ ...headerCellSx, display: { xs: 'none', md: 'table-cell' } }}>Submitted</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((feedback) => (
                  <TableRow
                    key={feedback.id}
                    hover
                    onClick={() => setSelected(feedback)}
                    sx={{
                      cursor: 'pointer',
                      '&:nth-of-type(odd)': { bgcolor: 'transparent' },
                      '&:nth-of-type(even)': { bgcolor: 'rgba(255,255,255,0.045)' },
                      '&:hover': { bgcolor: 'rgba(63,63,70,0.4)' },
                      transition: 'background-color 150ms',
                    }}
                  >
                    <TableCell sx={bodyCellSx}>
                      <DiscordUsernameCell userId={feedback.userId} fallback={feedback.userName ?? feedback.userEmail ?? 'Unknown'} />
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
                        {cohortNameMap.get(feedback.cohortId) ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={bodyCellSx}>
                      <FeedbackSummaryCell feedback={feedback} />
                    </TableCell>
                    <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" sx={{ color: '#71717a', whiteSpace: 'nowrap' }}>
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page + 1}
                onChange={(_, value) => setPage(value - 1)}
                sx={{
                  '& .MuiPaginationItem-root': { color: '#a1a1aa' },
                  '& .Mui-selected': { bgcolor: 'rgba(249,115,22,0.15) !important', color: '#fb923c' },
                }}
              />
            </Box>
          )}
        </>
      )}

      {selected && <FeedbackDetailDialog feedback={selected} onClose={() => setSelected(null)} />}
    </Box>
  );
};

export default FeedbackAdmin;
