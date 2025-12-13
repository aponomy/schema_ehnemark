import {
    Box,
    Button,
    CircularProgress,
    Container,
    Dropdown,
    IconButton,
    ListItemDecorator,
    Menu,
    MenuButton,
    MenuItem,
    Modal,
    ModalClose,
    ModalDialog,
    Sheet,
    Typography,
} from '@mui/joy';
import CssBaseline from '@mui/joy/CssBaseline';
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import { useCallback, useEffect, useState } from 'react';
import {
    clearToken,
    fetchProposals,
    fetchSchedule,
    formatDate,
    getStoredUser,
    updateProposal,
} from './api';
import { LoginForm, YearCalendar } from './components';
import type { DayInfo, Proposal, Schedule, User, ViewMode } from './types';

// Dark theme configuration
const theme = extendTheme({
  colorSchemes: {
    dark: {
      palette: {
        background: {
          body: '#1a1a1a',
          surface: '#242424',
        },
      },
    },
  },
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('confirmed');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayInfo, setSelectedDayInfo] = useState<DayInfo | null>(null);
  const [draggedDate, setDraggedDate] = useState<Date | null>(null);
  const [draggedDayInfo, setDraggedDayInfo] = useState<DayInfo | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [stats, setStats] = useState({ jenniferPercent: 0, klasPercent: 0 });

  const klasProposal = proposals.find(p => p.owner === 'Klas');
  const jenniferProposal = proposals.find(p => p.owner === 'Jennifer');

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser as User);
    }
    setLoading(false);
  }, []);

  // Fetch data when logged in
  const loadData = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const [scheduleData, proposalsData] = await Promise.all([
        fetchSchedule(),
        fetchProposals(),
      ]);
      setSchedule(scheduleData);
      setProposals(proposalsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setSaving(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setSchedule([]);
    setProposals([]);
    setViewMode('confirmed');
  };

  // Get the schedule to display based on view mode
  const getDisplaySchedule = (): Schedule[] => {
    if (viewMode === 'confirmed') return schedule;
    
    const proposal = viewMode === 'klas' ? klasProposal : jenniferProposal;
    if (proposal?.schedule_data) {
      try {
        return JSON.parse(proposal.schedule_data);
      } catch {
        return schedule;
      }
    }
    return schedule;
  };

  // Check if current user can edit the selected proposal
  const canEdit = () => {
    if (viewMode === 'confirmed') return false;
    const owner = viewMode === 'klas' ? 'Klas' : 'Jennifer';
    return user?.username === owner;
  };

  // Get proposal schedule data for editing
  const getProposalScheduleData = (): Array<{ switch_date: string; parent_after: string }> => {
    const proposal = viewMode === 'klas' ? klasProposal : jenniferProposal;
    if (proposal?.schedule_data) {
      try {
        return JSON.parse(proposal.schedule_data);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Handle date click on calendar
  const handleDateClick = async (date: Date, dayInfo: DayInfo) => {
    if (!canEdit()) return;
    setSelectedDate(date);
    setSelectedDayInfo(dayInfo);
    setDatePickerOpen(true);
  };

  // Handle drag start
  const handleDragStart = (date: Date, dayInfo: DayInfo) => {
    setDraggedDate(date);
    setDraggedDayInfo(dayInfo);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedDate(null);
    setDraggedDayInfo(null);
  };

  // Handle drop - move a switch day to a new date
  const handleDrop = async (targetDate: Date, targetDayInfo: DayInfo) => {
    if (!canEdit() || !draggedDate || !draggedDayInfo) return;
    
    const owner = user!.username as 'Klas' | 'Jennifer';
    const currentData = getProposalScheduleData();
    const draggedDateStr = formatDate(draggedDate);
    const targetDateStr = formatDate(targetDate);
    
    // Find the switch being dragged
    const existingSwitch = currentData.find(s => s.switch_date === draggedDateStr);
    if (!existingSwitch) return;
    
    // Don't drop on an existing switch
    if (targetDayInfo.isSwitch) {
      handleDragEnd();
      return;
    }
    
    // Move the switch to the new date
    const newData = currentData
      .filter(s => s.switch_date !== draggedDateStr)
      .concat({ switch_date: targetDateStr, parent_after: existingSwitch.parent_after })
      .sort((a, b) => a.switch_date.localeCompare(b.switch_date));
    
    setSaving(true);
    try {
      await updateProposal(owner, 'update_schedule', newData);
      await loadData();
    } catch (error) {
      console.error('Failed to move switch:', error);
      setSaving(false);
    }
    
    handleDragEnd();
  };

  // Toggle switch date
  const handleToggleSwitch = async (parentAfter: 'Jennifer' | 'Klas') => {
    if (!selectedDate || !canEdit()) return;
    
    const dateStr = formatDate(selectedDate);
    const owner = user!.username as 'Klas' | 'Jennifer';
    const currentData = getProposalScheduleData();
    
    // Check if this date already has a switch
    const existingIndex = currentData.findIndex(s => s.switch_date === dateStr);
    
    let newData: Array<{ switch_date: string; parent_after: string }>;
    
    if (existingIndex >= 0) {
      // Remove or update the switch
      if (currentData[existingIndex].parent_after === parentAfter) {
        // Same parent, remove the switch
        newData = currentData.filter((_, i) => i !== existingIndex);
      } else {
        // Different parent, update
        newData = [...currentData];
        newData[existingIndex] = { switch_date: dateStr, parent_after: parentAfter };
      }
    } else {
      // Add new switch
      newData = [...currentData, { switch_date: dateStr, parent_after: parentAfter }];
    }
    
    // Sort by date
    newData.sort((a, b) => a.switch_date.localeCompare(b.switch_date));
    
    setSaving(true);
    try {
      await updateProposal(owner, 'update_schedule', newData);
      await loadData();
    } catch (error) {
      console.error('Failed to update schedule:', error);
      setSaving(false);
    }
    
    setDatePickerOpen(false);
    setSelectedDate(null);
    setSelectedDayInfo(null);
  };

  // Remove switch date
  const handleRemoveSwitch = async () => {
    if (!selectedDate || !canEdit()) return;
    
    const dateStr = formatDate(selectedDate);
    const owner = user!.username as 'Klas' | 'Jennifer';
    const currentData = getProposalScheduleData();
    
    const newData = currentData.filter(s => s.switch_date !== dateStr);
    
    setSaving(true);
    try {
      await updateProposal(owner, 'update_schedule', newData);
      await loadData();
    } catch (error) {
      console.error('Failed to remove switch:', error);
      setSaving(false);
    }
    
    setDatePickerOpen(false);
    setSelectedDate(null);
    setSelectedDayInfo(null);
  };

  // Proposal actions
  const handleActivateProposal = async () => {
    const owner = user!.username as 'Klas' | 'Jennifer';
    setSaving(true);
    try {
      await updateProposal(owner, 'activate');
      await loadData();
      setViewMode(owner === 'Klas' ? 'klas' : 'jennifer');
    } catch (error) {
      console.error('Failed to activate proposal:', error);
      setSaving(false);
    }
  };

  const handleDeactivateProposal = async () => {
    const owner = user!.username as 'Klas' | 'Jennifer';
    setSaving(true);
    try {
      await updateProposal(owner, 'deactivate');
      await loadData();
      setViewMode('confirmed');
    } catch (error) {
      console.error('Failed to deactivate proposal:', error);
      setSaving(false);
    }
  };

  const handleCopyFromConfirmed = async () => {
    const owner = user!.username as 'Klas' | 'Jennifer';
    setSaving(true);
    try {
      await updateProposal(owner, 'copy_from_confirmed');
      await loadData();
    } catch (error) {
      console.error('Failed to copy:', error);
      setSaving(false);
    }
  };

  const handleCopyFromOther = async () => {
    const owner = user!.username as 'Klas' | 'Jennifer';
    setSaving(true);
    try {
      await updateProposal(owner, 'copy_from_other');
      await loadData();
    } catch (error) {
      console.error('Failed to copy:', error);
      setSaving(false);
    }
  };

  // Send proposal to other parent
  const handleSendProposal = async () => {
    const owner = user!.username as 'Klas' | 'Jennifer';
    setSaving(true);
    try {
      await updateProposal(owner, 'send');
      await loadData();
    } catch (error) {
      console.error('Failed to send proposal:', error);
      setSaving(false);
    }
  };

  // Respond to other parent's proposal (copy to own proposal)
  const handleRespondToProposal = async () => {
    // owner is the OTHER person's proposal we're viewing
    const proposalOwner = viewMode === 'klas' ? 'Klas' : 'Jennifer';
    setSaving(true);
    try {
      await updateProposal(proposalOwner as 'Klas' | 'Jennifer', 'respond');
      await loadData();
      // Switch to own proposal view
      setViewMode(user!.username === 'Klas' ? 'klas' : 'jennifer');
    } catch (error) {
      console.error('Failed to respond to proposal:', error);
      setSaving(false);
    }
  };

  // Accept other parent's proposal (replace confirmed schedule)
  const handleAcceptProposal = async () => {
    // owner is the proposal being accepted
    const proposalOwner = viewMode === 'klas' ? 'Klas' : 'Jennifer';
    setSaving(true);
    try {
      await updateProposal(proposalOwner as 'Klas' | 'Jennifer', 'accept');
      await loadData();
      setViewMode('confirmed');
    } catch (error) {
      console.error('Failed to accept proposal:', error);
      setSaving(false);
    }
  };

  // Check if user's own proposal is active
  const isOwnProposalActive = () => {
    if (!user) return false;
    const proposal = user.username === 'Klas' ? klasProposal : jenniferProposal;
    return !!proposal?.is_active;
  };

  // Check if user's own proposal has been sent
  const isOwnProposalSent = () => {
    if (!user) return false;
    const proposal = user.username === 'Klas' ? klasProposal : jenniferProposal;
    return !!proposal?.is_sent;
  };

  // Check if viewing other parent's sent proposal
  const isViewingOtherSentProposal = () => {
    if (viewMode === 'confirmed') return false;
    const proposalOwner = viewMode === 'klas' ? 'Klas' : 'Jennifer';
    if (proposalOwner === user?.username) return false;
    const proposal = viewMode === 'klas' ? klasProposal : jenniferProposal;
    return !!proposal?.is_sent;
  };

  const otherParent = user?.username === 'Klas' ? 'Jennifer' : 'Klas';

  if (loading) {
    return (
      <CssVarsProvider theme={theme} defaultMode="dark">
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography>Laddar...</Typography>
        </Box>
      </CssVarsProvider>
    );
  }

  if (!user) {
    return (
      <CssVarsProvider theme={theme} defaultMode="dark">
        <CssBaseline />
        <LoginForm onLogin={handleLogin} />
      </CssVarsProvider>
    );
  }

  // Build view options
  const displaySchedule = getDisplaySchedule();
  const isEditing = canEdit();

  return (
    <CssVarsProvider theme={theme} defaultMode="dark">
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Sheet
          component="header"
          sx={{
            p: { xs: 1.5, md: 2 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography level="h4" sx={{ fontSize: { xs: '1.1rem', md: '1.5rem' } }}>Pojkarnas Schema</Typography>
                {saving && <CircularProgress size="sm" sx={{ '--CircularProgress-size': '16px' }} />}
              </Box>
              
              {/* View mode links */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 } }}>
                <Button
                  size="sm"
                  variant={viewMode === 'confirmed' ? 'solid' : 'plain'}
                  onClick={() => setViewMode('confirmed')}
                  sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                >
                  Bestämt
                </Button>
                {/* Show Klas proposal: if it's the user's own (active) OR if it's sent by Klas to Jennifer */}
                {!!klasProposal?.is_active && (user?.username === 'Klas' || !!klasProposal?.is_sent) && (
                  <Button
                    size="sm"
                    variant={viewMode === 'klas' ? 'solid' : 'plain'}
                    onClick={() => setViewMode('klas')}
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    Klas
                  </Button>
                )}
                {/* Show Jennifer proposal: if it's the user's own (active) OR if it's sent by Jennifer to Klas */}
                {!!jenniferProposal?.is_active && (user?.username === 'Jennifer' || !!jenniferProposal?.is_sent) && (
                  <Button
                    size="sm"
                    variant={viewMode === 'jennifer' ? 'solid' : 'plain'}
                    onClick={() => setViewMode('jennifer')}
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    Jennifer
                  </Button>
                )}
                
                {/* Activate proposal button - only show if user doesn't have an active proposal */}
                {!isOwnProposalActive() && (
                  <Button size="sm" variant="soft" onClick={handleActivateProposal}>
                    Skapa {user.username} Förslag
                  </Button>
                )}
              </Box>

              {/* User info & logout */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography level="body-sm" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {user.username}
                </Typography>
                <Button variant="plain" size="sm" onClick={handleLogout}>
                  Logga ut
                </Button>
              </Box>
            </Box>
            
            {/* Edit mode indicator - editing own proposal */}
            {isEditing && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.softBg', borderRadius: 'sm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography level="body-xs" sx={{ color: 'warning.plainColor' }}>
                  {isOwnProposalSent() ? 'Förslaget är skickat' : 'Redigeringsläge'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton 
                    size="sm" 
                    variant="outlined" 
                    onClick={() => setHelpOpen(true)} 
                    sx={{ 
                      color: 'warning.plainColor', 
                      borderColor: 'warning.plainColor',
                      minWidth: 24,
                      minHeight: 24,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ?
                  </IconButton>
                  <Dropdown>
                    <MenuButton
                      size="sm"
                      variant="outlined"
                      sx={{ 
                        color: 'warning.plainColor', 
                        borderColor: 'warning.plainColor',
                        fontSize: '0.75rem',
                      }}
                    >
                      Åtgärder...
                    </MenuButton>
                    <Menu placement="bottom-end" size="sm">
                      <MenuItem onClick={handleDeactivateProposal}>
                        <ListItemDecorator>✕</ListItemDecorator>
                        Återkalla förslag
                      </MenuItem>
                      <MenuItem onClick={handleCopyFromConfirmed}>
                        <ListItemDecorator>📋</ListItemDecorator>
                        Kopiera från Bestämt
                      </MenuItem>
                      <MenuItem onClick={handleCopyFromOther}>
                        <ListItemDecorator>📋</ListItemDecorator>
                        Kopiera från {otherParent}
                      </MenuItem>
                    </Menu>
                  </Dropdown>
                  {!isOwnProposalSent() && (
                    <Button 
                      size="sm" 
                      variant="solid"
                      color="success"
                      onClick={handleSendProposal}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Skicka
                    </Button>
                  )}
                </Box>
              </Box>
            )}
            
            {/* Viewing other parent's sent proposal */}
            {isViewingOtherSentProposal() && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'primary.softBg', borderRadius: 'sm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography level="body-xs" sx={{ color: 'primary.plainColor' }}>
                  {viewMode === 'klas' ? 'Klas' : 'Jennifer'} förslag
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton 
                    size="sm" 
                    variant="outlined" 
                    onClick={() => setHelpOpen(true)} 
                    sx={{ 
                      color: 'primary.plainColor', 
                      borderColor: 'primary.plainColor',
                      minWidth: 24,
                      minHeight: 24,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ?
                  </IconButton>
                  <Button 
                    size="sm" 
                    variant="outlined"
                    color="primary"
                    onClick={() => setRespondModalOpen(true)}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Respondera
                  </Button>
                  <Button 
                    size="sm" 
                    variant="solid"
                    color="success"
                    onClick={handleAcceptProposal}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    Acceptera
                  </Button>
                </Box>
              </Box>
            )}
          </Container>
        </Sheet>

        {/* Body */}
        <Box component="main" sx={{ flex: 1, py: { xs: 1, md: 3 } }}>
          <Container maxWidth="md">
            <YearCalendar
              schedule={displaySchedule}
              isEditable={isEditing}
              onDateClick={handleDateClick}
              draggedDate={draggedDate}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              onStatsCalculated={setStats}
            />
          </Container>
        </Box>

        {/* Footer */}
        <Sheet
          component="footer"
          sx={{
            p: { xs: 1, md: 2 },
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography level="body-xs" sx={{ color: 'neutral.500' }}>
              <Box component="span" sx={{ color: 'rgb(244, 114, 182)' }}>Jennifer {stats.jenniferPercent}%</Box>
              {' · '}
              <Box component="span" sx={{ color: 'rgb(96, 165, 250)' }}>Klas {stats.klasPercent}%</Box>
            </Typography>
            <Typography level="body-xs" sx={{ color: 'neutral.500' }}>
              © {new Date().getFullYear()} Ehnemark
            </Typography>
          </Container>
        </Sheet>

        {/* Date picker modal */}
        <Modal open={datePickerOpen} onClose={() => { setDatePickerOpen(false); setSelectedDayInfo(null); }}>
          <ModalDialog size="sm">
            <ModalClose />
            <Typography level="title-md">
              {selectedDate?.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Typography>
            
            {selectedDate && selectedDayInfo && (
              <Box sx={{ mt: 2 }}>
                {selectedDayInfo.isSwitch ? (
                  // This is a switch day - only show delete option
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    <Typography level="body-sm" sx={{ mb: 1, color: 'neutral.400' }}>
                      Detta är en växlingsdag. Dra för att flytta, eller ta bort.
                    </Typography>
                    <Button
                      variant="soft"
                      color="danger"
                      onClick={handleRemoveSwitch}
                    >
                      Ta bort växling
                    </Button>
                  </Box>
                ) : (
                  // Regular day - show option to switch to the OTHER parent only
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    <Typography level="body-sm" sx={{ mb: 1 }}>
                      Lägg till växling:
                    </Typography>
                    {/* Only show option to switch to the OTHER parent */}
                    {selectedDayInfo.parent === 'Jennifer' ? (
                      <Button
                        variant="soft"
                        sx={{ bgcolor: 'rgba(96, 165, 250, 0.3)', '&:hover': { bgcolor: 'rgba(96, 165, 250, 0.5)' } }}
                        onClick={() => handleToggleSwitch('Klas')}
                      >
                        Växla till Klas
                      </Button>
                    ) : (
                      <Button
                        variant="soft"
                        sx={{ bgcolor: 'rgba(244, 114, 182, 0.3)', '&:hover': { bgcolor: 'rgba(244, 114, 182, 0.5)' } }}
                        onClick={() => handleToggleSwitch('Jennifer')}
                      >
                        Växla till Jennifer
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </ModalDialog>
        </Modal>

        {/* Help modal */}
        <Modal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <ModalDialog size="md">
            <ModalClose />
            {isViewingOtherSentProposal() ? (
              <>
                <Typography level="title-lg" sx={{ mb: 2 }}>
                  Granska förslag
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography level="body-sm">
                    Du tittar på {viewMode === 'klas' ? 'Klas' : 'Jennifer'}s förslag. Kalendern är i endast-visa läge.
                  </Typography>
                  <Box>
                    <Typography level="title-sm" sx={{ color: 'primary.400' }}>Respondera</Typography>
                    <Typography level="body-sm">
                      Kopiera detta förslag till ditt eget så du kan göra ändringar och skicka tillbaka ett motförslag.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="title-sm" sx={{ color: 'success.400' }}>Acceptera</Typography>
                    <Typography level="body-sm">
                      Godkänn förslaget. Det blir det nya bekräftade schemat för båda.
                    </Typography>
                  </Box>
                </Box>
              </>
            ) : (
              <>
                <Typography level="title-lg" sx={{ mb: 2 }}>
                  Hur man redigerar schemat
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography level="title-sm" sx={{ color: 'primary.400' }}>Flytta en växlingsdag</Typography>
                    <Typography level="body-sm">
                      Dra en dag med ring (växlingsdag) till ett nytt datum för att flytta den.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="title-sm" sx={{ color: 'primary.400' }}>Ta bort en växlingsdag</Typography>
                    <Typography level="body-sm">
                      Klicka på en dag med ring och välj "Ta bort växling".
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="title-sm" sx={{ color: 'primary.400' }}>Lägg till en växlingsdag</Typography>
                    <Typography level="body-sm">
                      Klicka på en vanlig dag för att lägga till en växling till den andra föräldern.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="title-sm" sx={{ color: 'primary.400' }}>Åtgärder</Typography>
                    <Typography level="body-sm">
                      • <strong>Återkalla</strong> - Ta bort ditt förslag<br />
                      • <strong>Kopiera från Bestämt</strong> - Återställ till det bekräftade schemat<br />
                      • <strong>Kopiera från [namn]</strong> - Kopiera den andres förslag
                    </Typography>
                  </Box>
                  <Box>
                    <Typography level="title-sm" sx={{ color: 'success.400' }}>Skicka</Typography>
                    <Typography level="body-sm">
                      När du är klar, skicka förslaget till den andra föräldern för granskning.
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
            <Button sx={{ mt: 2 }} onClick={() => setHelpOpen(false)}>Stäng</Button>
          </ModalDialog>
        </Modal>

        {/* Respond confirmation modal */}
        <Modal open={respondModalOpen} onClose={() => setRespondModalOpen(false)}>
          <ModalDialog size="md">
            <ModalClose />
            <Typography level="title-lg" sx={{ mb: 2 }}>
              Respondera på förslag
            </Typography>
            <Typography level="body-md" sx={{ mb: 3 }}>
              För att besvara {viewMode === 'klas' ? 'Klas' : 'Jennifer'} förslag kommer {viewMode === 'klas' ? 'hans' : 'hennes'} schema först kopieras till ditt, därefter kan du göra ändringar och slutligen klicka på Skicka knappen.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
              <Button 
                variant="solid" 
                color="primary"
                onClick={() => {
                  setRespondModalOpen(false);
                  handleRespondToProposal();
                }}
              >
                Ja, kopiera {viewMode === 'klas' ? 'Klas' : 'Jennifer'} förslag till mitt förslag så att jag kan göra ändringar
              </Button>
              <Button 
                variant="outlined" 
                color="neutral"
                onClick={() => setRespondModalOpen(false)}
              >
                Avbryt
              </Button>
            </Box>
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
}

export default App;
