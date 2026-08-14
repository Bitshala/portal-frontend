import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from 'lucide-react';

import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import { fontFamilyMono } from '../../../components/fellowship/theme';
import RoleBadge from '../../../components/user/RoleBadge';
import { useUsers } from '../../../hooks/userHooks';
import { useDebounce } from '../../../hooks/useDebounce';
import { SortOrder } from '../../../types/api';
import type { UserSearchResultDto, UsersSortBy } from '../../../types/userOverview';
import { formatCohortDate } from '../../../helpers/cohortHelpers';
import { extractErrorMessage, isBadFilterError } from '../../../utils/errorUtils';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

// ---- helpers ----

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_TINTS = [
  { bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
];
const tintFor = (seed: string) => AVATAR_TINTS[hash(seed) % AVATAR_TINTS.length];

// ---- page ----

const UsersAdmin = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<UsersSortBy>('createdAt');
  const [sortDir, setSortDir] = useState<SortOrder>(SortOrder.DESC);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const debouncedSearch = useDebounce(search.trim(), 300);

  // Reset to the first page whenever the query or sort changes.
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, sortKey, sortDir, pageSize]);

  const { data, isLoading, isError, error } = useUsers(
    {
      page,
      pageSize,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      sortBy: sortKey,
      sortOrder: sortDir,
    },
    { placeholderData: (prev) => prev },
  );

  const users = useMemo(() => data?.records ?? [], [data?.records]);
  const totalRecords = data?.totalRecords ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRecords / pageSize));

  const toggleSort = (key: UsersSortBy) => {
    if (sortKey === key) {
      setSortDir((d) => (d === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC));
    } else {
      setSortKey(key);
      setSortDir(SortOrder.DESC);
    }
  };

  return (
    <FellowshipPageLayout
      title="Users"
      subtitle="Search users and view their participation."
      badge="Admin"
      hideIcon
    >
      {isError && (
        <Alert severity={isBadFilterError(error) ? 'warning' : 'error'} sx={{ mb: 2 }}>
          {isBadFilterError(error)
            ? `Invalid search — please adjust and try again. (${extractErrorMessage(error)})`
            : `Couldn't load users: ${extractErrorMessage(error)}`}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ mt: 1.5, mb: 2 }}>
        <TextField
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, Discord…"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} />
                </InputAdornment>
              ),
            },
            htmlInput: { maxLength: 100 },
          }}
          sx={{ flexGrow: 1, maxWidth: { sm: 420 } }}
        />
      </Stack>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.75,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <HeaderRow sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={22} />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {debouncedSearch ? 'No users match your search.' : 'No users found.'}
            </Typography>
          </Box>
        ) : (
          <>
            {users.map((u) => (
              <UserRow key={u.id} user={u} onOpen={() => navigate(`/admin/users/${u.id}`)} />
            ))}
            {totalRecords > 0 && (
              <PaginationFooter
                page={page}
                pageCount={pageCount}
                total={totalRecords}
                pageSize={pageSize}
                onChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </>
        )}
      </Box>
    </FellowshipPageLayout>
  );
};

// ---- table header ----

// Order: User, Email, Discord, Role, Joined.
const COLS =
  'minmax(200px, 1.8fr) minmax(180px, 1.6fr) minmax(140px, 1.1fr) minmax(120px, 0.9fr) minmax(110px, 0.9fr)';
const COL_GAP = 2;

const SortableHeader = ({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortOrder;
  onClick: () => void;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.4,
      cursor: 'pointer',
      userSelect: 'none',
      color: active ? 'primary.light' : 'inherit',
      '&:hover': { color: 'text.primary' },
    }}
  >
    {label}
    {active && (dir === SortOrder.ASC ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
  </Box>
);

const HeaderRow = ({
  sortKey,
  sortDir,
  onSort,
}: {
  sortKey: UsersSortBy;
  sortDir: SortOrder;
  onSort: (key: UsersSortBy) => void;
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: COLS,
      columnGap: COL_GAP,
      px: 2,
      py: 1,
      borderBottom: '1px solid',
      borderColor: 'divider',
      color: 'text.secondary',
      fontSize: '0.66rem',
      letterSpacing: 0.8,
      fontWeight: 700,
      textTransform: 'uppercase',
    }}
  >
    <SortableHeader
      label="User"
      active={sortKey === 'name'}
      dir={sortDir}
      onClick={() => onSort('name')}
    />
    <SortableHeader
      label="Email"
      active={sortKey === 'email'}
      dir={sortDir}
      onClick={() => onSort('email')}
    />
    <Box>Discord</Box>
    <Box>Role</Box>
    <SortableHeader
      label="Joined"
      active={sortKey === 'createdAt'}
      dir={sortDir}
      onClick={() => onSort('createdAt')}
    />
  </Box>
);

// ---- pagination footer ----

const PaginationFooter = ({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1 }}>
      <RowsPerPageSelect value={pageSize} onChange={onPageSizeChange} />
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.74rem', color: 'text.secondary' }}>
          {from}–{to} of {total}
        </Typography>
        <IconButton
          size="small"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <ChevronLeft size={16} />
        </IconButton>
        <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.74rem', color: 'text.secondary' }}>
          {page + 1} / {pageCount}
        </Typography>
        <IconButton
          size="small"
          aria-label="Next page"
          disabled={page >= pageCount - 1}
          onClick={() => onChange(page + 1)}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <ChevronRight size={16} />
        </IconButton>
      </Stack>
    </Stack>
  );
};

const RowsPerPageSelect = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (size: number) => void;
}) => (
  <Stack direction="row" spacing={0.75} alignItems="center">
    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Rows</Typography>
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      slotProps={{ htmlInput: { 'aria-label': 'Rows per page' } }}
      sx={{ '& .MuiSelect-select': { py: 0.25, pl: 1, fontSize: '0.74rem' } }}
    >
      {PAGE_SIZE_OPTIONS.map((n) => (
        <MenuItem key={n} value={n} sx={{ fontSize: '0.8rem' }}>
          {n}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
);

// ---- row ----

const UserRow = ({ user, onOpen }: { user: UserSearchResultDto; onOpen: () => void }) => {
  const tint = tintFor(user.id);
  const subtitle = user.name && user.name !== user.displayName ? user.name : null;

  return (
    <Box
      onClick={onOpen}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLS,
        columnGap: COL_GAP,
        alignItems: 'center',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'background-color 0.12s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      {/* User */}
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: tint.bg,
            color: tint.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials(user.displayName)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.86rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.displayName}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Email */}
      <Typography
        sx={{
          fontSize: '0.82rem',
          color: user.email ? 'text.primary' : 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 1,
        }}
      >
        {user.email ?? '—'}
      </Typography>

      {/* Discord */}
      <Typography
        sx={{
          fontFamily: fontFamilyMono,
          fontSize: '0.78rem',
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 1,
        }}
      >
        {user.discordUsername}
      </Typography>

      {/* Role */}
      <Box>
        <RoleBadge role={user.role} />
      </Box>

      {/* Joined */}
      <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.78rem', color: 'text.secondary' }}>
        {formatCohortDate(user.createdAt)}
      </Typography>
    </Box>
  );
};

export default UsersAdmin;
