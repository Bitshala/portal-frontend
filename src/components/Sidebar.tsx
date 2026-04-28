import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
  Popper,
  Paper,
} from '@mui/material';
import {
  GraduationCap,
  LayoutDashboard,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Award,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { useUser } from '../hooks/userHooks';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/enums';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const adminNavItems: NavItem[] = [
  { label: 'Cohorts', path: '/select', icon: GraduationCap },
  { label: 'Cohort Metrics', path: '/cohort-metrics', icon: BarChart3 },
];

const studentNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/myDashboard', icon: LayoutDashboard },
  { label: 'Profile', path: '/me', icon: User },
];

const instructionLinks = [
  { label: 'General', path: '/general-instructions' },
  { label: 'Mastering Bitcoin', path: '/mb-instructions' },
  { label: 'Learning Bitcoin CLI', path: '/lbtcl-instructions' },
  { label: 'Lightning Network', path: '/ln-instructions' },
  { label: 'Bitcoin Protocol Dev', path: '/bpd-instructions' },
];

const fellowshipStudentLinks = [
  { label: 'Apply', path: '/fellowship/apply', icon: FileText },
  { label: 'My Fellowships', path: '/fellowship/me', icon: Award },
];

const adminFellowshipLinks = [
  { label: 'Applications', path: '/admin/fellowships/applications', icon: FileText },
  { label: 'Manage', path: '/admin/fellowships', icon: Award },
  { label: 'Reports', path: '/admin/fellowships/reports', icon: ClipboardList },
];

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

const getInitial = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useUser();
  const { logout } = useAuth();

  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [instructionsHover, setInstructionsHover] = useState(false);
  const instructionsAnchorRef = useRef<HTMLDivElement>(null);
  const instructionsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fellowshipsOpen, setFellowshipsOpen] = useState(
    () =>
      location.pathname.startsWith('/fellowship') ||
      location.pathname.startsWith('/admin/fellowships'),
  );
  const [fellowshipsHover, setFellowshipsHover] = useState(false);
  const fellowshipsAnchorRef = useRef<HTMLDivElement>(null);
  const fellowshipsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const HOVER_CLOSE_DELAY = 150;

  const openFellowshipsHover = () => {
    if (fellowshipsCloseTimer.current) {
      clearTimeout(fellowshipsCloseTimer.current);
      fellowshipsCloseTimer.current = null;
    }
    setFellowshipsHover(true);
  };
  const closeFellowshipsHover = () => {
    if (fellowshipsCloseTimer.current) clearTimeout(fellowshipsCloseTimer.current);
    fellowshipsCloseTimer.current = setTimeout(
      () => setFellowshipsHover(false),
      HOVER_CLOSE_DELAY,
    );
  };

  const openInstructionsHover = () => {
    if (instructionsCloseTimer.current) {
      clearTimeout(instructionsCloseTimer.current);
      instructionsCloseTimer.current = null;
    }
    setInstructionsHover(true);
  };
  const closeInstructionsHover = () => {
    if (instructionsCloseTimer.current) clearTimeout(instructionsCloseTimer.current);
    instructionsCloseTimer.current = setTimeout(
      () => setInstructionsHover(false),
      HOVER_CLOSE_DELAY,
    );
  };

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('sidebar-collapsed', String(next));
    } catch {
      // ignore
    }
  };

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHING_ASSISTANT;
  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const isActive = (path: string) => location.pathname === path;

  const fellowshipsSectionActive =
    location.pathname.startsWith('/fellowship') ||
    location.pathname.startsWith('/admin/fellowships');

  const drawerWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const activeItemSx = {
    bgcolor: 'rgba(249,115,22,0.08)',
    color: '#fb923c',
    '&:hover': { bgcolor: 'rgba(249,115,22,0.12)' },
  };

  const inactiveItemSx = {
    color: '#a1a1aa',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: '#e4e4e7' },
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          bgcolor: '#0f0f0f',
          borderRight: '1px solid #27272a',
          transition: 'width 200ms ease',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2.5,
          height: 64,
          borderBottom: '1px solid #27272a',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1.1rem' }}>
            Bitshala
          </Typography>
        )}
        <IconButton onClick={toggleCollapse} size="small" sx={{ color: '#71717a', '&:hover': { color: '#d4d4d8', bgcolor: '#27272a' } }}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 1.5, px: 1, overflowY: 'auto' }}>
        <List disablePadding>
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    py: 1.25,
                    px: collapsed ? 0 : 2,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    minHeight: 44,
                    ...(active ? activeItemSx : inactiveItemSx),
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: collapsed ? 0 : 36,
                      color: 'inherit',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>

        <Divider sx={{ borderColor: '#27272a', my: 1.5 }} />

        <List disablePadding>
          <Box
            ref={fellowshipsAnchorRef}
            onMouseEnter={() => collapsed && openFellowshipsHover()}
            onMouseLeave={() => collapsed && closeFellowshipsHover()}
          >
            <ListItemButton
              onClick={() =>
                collapsed
                  ? navigate('/fellowship/me')
                  : setFellowshipsOpen((o) => !o)
              }
              sx={{
                borderRadius: 1.5,
                py: 1.25,
                px: collapsed ? 0 : 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                minHeight: 44,
                ...(fellowshipsSectionActive ? activeItemSx : inactiveItemSx),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 36,
                  color: 'inherit',
                  justifyContent: 'center',
                }}
              >
                <Award size={20} strokeWidth={fellowshipsSectionActive ? 2.2 : 1.8} />
              </ListItemIcon>
              {!collapsed && (
                <>
                  <ListItemText
                    primary="Fellowships"
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                  />
                  {fellowshipsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </>
              )}
            </ListItemButton>
          </Box>

          {collapsed && (
            <Popper
              open={fellowshipsHover}
              anchorEl={fellowshipsAnchorRef.current}
              placement="right-start"
              sx={{ zIndex: 1300 }}
            >
              <Paper
                onMouseEnter={openFellowshipsHover}
                onMouseLeave={closeFellowshipsHover}
                sx={{
                  bgcolor: '#1c1c1f',
                  border: '1px solid #27272a',
                  borderRadius: 1.5,
                  py: 0.5,
                  ml: 0,
                  minWidth: 200,
                }}
              >
                {fellowshipStudentLinks.map((link) => {
                  const active = isActive(link.path);
                  const Icon = link.icon;
                  return (
                    <ListItemButton
                      key={link.path}
                      onClick={() => {
                        navigate(link.path);
                        setFellowshipsHover(false);
                      }}
                      sx={{
                        py: 0.75,
                        px: 2,
                        gap: 1,
                        ...(active
                          ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.08)', '&:hover': { bgcolor: 'rgba(249,115,22,0.12)' } }
                          : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                      }}
                    >
                      <Icon size={15} />
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        {link.label}
                      </Typography>
                    </ListItemButton>
                  );
                })}
                {isAdmin && (
                  <>
                    <Divider sx={{ borderColor: '#27272a', my: 0.5 }} />
                    <Typography
                      sx={{
                        px: 2,
                        pt: 0.5,
                        pb: 0.25,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#52525b',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      Admin
                    </Typography>
                    {adminFellowshipLinks.map((link) => {
                      const active = isActive(link.path);
                      const Icon = link.icon;
                      return (
                        <ListItemButton
                          key={link.path}
                          onClick={() => {
                            navigate(link.path);
                            setFellowshipsHover(false);
                          }}
                          sx={{
                            py: 0.75,
                            px: 2,
                            gap: 1,
                            ...(active
                              ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.08)', '&:hover': { bgcolor: 'rgba(249,115,22,0.12)' } }
                              : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                          }}
                        >
                          <Icon size={15} />
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                            {link.label}
                          </Typography>
                        </ListItemButton>
                      );
                    })}
                  </>
                )}
              </Paper>
            </Popper>
          )}

          {!collapsed && (
            <Collapse in={fellowshipsOpen} timeout="auto" unmountOnExit>
              <List
                disablePadding
                sx={{ pl: 2.5, borderLeft: '1px solid #3f3f46', ml: 3, mt: 0.5 }}
              >
                {fellowshipStudentLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <ListItemButton
                      key={link.path}
                      onClick={() => navigate(link.path)}
                      sx={{
                        borderRadius: 1,
                        py: 1,
                        px: 1.5,
                        mb: 0.25,
                        ...(active
                          ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.1)', '&:hover': { bgcolor: 'rgba(249,115,22,0.15)' } }
                          : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                      />
                    </ListItemButton>
                  );
                })}
                {isAdmin && (
                  <>
                    <Typography
                      sx={{
                        px: 1.5,
                        pt: 1,
                        pb: 0.25,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#52525b',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      Admin
                    </Typography>
                    {adminFellowshipLinks.map((link) => {
                      const active = isActive(link.path);
                      return (
                        <ListItemButton
                          key={link.path}
                          onClick={() => navigate(link.path)}
                          sx={{
                            borderRadius: 1,
                            py: 1,
                            px: 1.5,
                            mb: 0.25,
                            ...(active
                              ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.1)', '&:hover': { bgcolor: 'rgba(249,115,22,0.15)' } }
                              : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                          }}
                        >
                          <ListItemText
                            primary={link.label}
                            primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </>
                )}
              </List>
            </Collapse>
          )}
        </List>

        <Divider sx={{ borderColor: '#27272a', my: 1.5 }} />

        {/* Instructions Section */}
        <List disablePadding>
          <Box
            ref={instructionsAnchorRef}
            onMouseEnter={() => collapsed && openInstructionsHover()}
            onMouseLeave={() => collapsed && closeInstructionsHover()}
          >
            <ListItemButton
              onClick={() => collapsed ? navigate('/general-instructions') : setInstructionsOpen(!instructionsOpen)}
              sx={{
                borderRadius: 1.5,
                py: 1.25,
                px: collapsed ? 0 : 2,
                justifyContent: collapsed ? 'center' : 'flex-start',
                minHeight: 44,
                ...(instructionLinks.some(l => isActive(l.path)) ? activeItemSx : inactiveItemSx),
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 36,
                  color: 'inherit',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={20} strokeWidth={instructionLinks.some(l => isActive(l.path)) ? 2.2 : 1.8} />
              </ListItemIcon>
              {!collapsed && (
                <>
                  <ListItemText
                    primary="Instructions"
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                  />
                  {instructionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </>
              )}
            </ListItemButton>
          </Box>

          {/* Collapsed hover flyout */}
          {collapsed && (
            <Popper
              open={instructionsHover}
              anchorEl={instructionsAnchorRef.current}
              placement="right-start"
              sx={{ zIndex: 1300 }}
            >
              <Paper
                onMouseEnter={openInstructionsHover}
                onMouseLeave={closeInstructionsHover}
                sx={{
                  bgcolor: '#1c1c1f',
                  border: '1px solid #27272a',
                  borderRadius: 1.5,
                  py: 0.5,
                  ml: 0,
                  minWidth: 180,
                }}
              >
                {instructionLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <ListItemButton
                      key={link.path}
                      onClick={() => { navigate(link.path); setInstructionsHover(false); }}
                      sx={{
                        py: 0.75,
                        px: 2,
                        ...(active
                          ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.08)', '&:hover': { bgcolor: 'rgba(249,115,22,0.12)' } }
                          : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        {link.label}
                      </Typography>
                    </ListItemButton>
                  );
                })}
              </Paper>
            </Popper>
          )}

          {!collapsed && (
            <Collapse in={instructionsOpen} timeout="auto" unmountOnExit>
              <List disablePadding sx={{ pl: 2.5, borderLeft: '1px solid #3f3f46', ml: 3, mt: 0.5 }}>
                {instructionLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <ListItemButton
                      key={link.path}
                      onClick={() => navigate(link.path)}
                      sx={{
                        borderRadius: 1,
                        py: 1,
                        px: 1.5,
                        mb: 0.25,
                        ...(active
                          ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.1)', '&:hover': { bgcolor: 'rgba(249,115,22,0.15)' } }
                          : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          )}
        </List>
      </Box>

      {/* Bottom: User info + Logout */}
      <Box sx={{ borderTop: '1px solid #27272a', px: 1, py: 1.5, flexShrink: 0 }}>
        {/* User Info */}
        {user && (
          <Tooltip title={collapsed ? (user.name || user.discordUsername || '') : ''} placement="right" arrow>
            <ListItemButton
              onClick={() => navigate('/myDashboard')}
              sx={{
                borderRadius: 1.5,
                py: 1,
                px: collapsed ? 0 : 1.5,
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: '#d4d4d8',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                mb: 0.5,
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#3f3f46',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#d4d4d8',
                  mr: collapsed ? 0 : 1.5,
                }}
              >
                {getInitial(user.name || user.discordUsername)}
              </Avatar>
              {!collapsed && (
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {user.name || user.discordUsername}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: '#71717a', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                  >
                    {user.role}
                  </Typography>
                </Box>
              )}
            </ListItemButton>
          </Tooltip>
        )}

        {/* Logout */}
        <Tooltip title={collapsed ? 'Logout' : ''} placement="right" arrow>
          <ListItemButton
            onClick={logout}
            sx={{
              borderRadius: 1.5,
              py: 1,
              px: collapsed ? 0 : 2,
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: '#a1a1aa',
              '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: collapsed ? 0 : 36,
                color: 'inherit',
                justifyContent: 'center',
              }}
            >
              <LogOut size={20} strokeWidth={1.8} />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
