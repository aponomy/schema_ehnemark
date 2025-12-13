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
  Textarea,
  Typography,
} from '@mui/joy';
import CssBaseline from '@mui/joy/CssBaseline';
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import { useCallback, useEffect, useState } from 'react';
import {
  clearToken,
  fetchProposal,
  fetchSchedule,
  formatDate,
  getStoredUser,
  updateProposal,
} from './api';
import { LoginForm, YearCalendar } from './components';
import type { DayInfo, Proposal, ProposalComment, Schedule, User, ViewMode } from './types';

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
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('confirmed');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayInfo, setSelectedDayInfo] = useState<DayInfo | null>(null);
  const [draggedDate, setDraggedDate] = useState<Date | null>(null);
  const [, setDraggedDayInfo] = useState<DayInfo | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [stats, setStats] = useState({ jenniferPercent: 0, klasPercent: 0 });

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser as User);
    }
    setLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const [scheduleData, proposalData] = await Promise.all([
        fetchSchedule(),
        fetchProposal(),
      ]);
      setSchedule(scheduleData);
      setProposal(proposalData.proposal);
      setComments(proposalData.comments);
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
    setProposal(null);
    setComments([]);
    setViewMode('confirmed');
  };

  const getDisplaySchedule = (): Schedule[] => {
    if (viewMode === 'confirmed') return schedule;
    if (proposal?.schedule_data) {
      try {
        return JSON.parse(proposal.schedule_data);
      } catch {
        return schedule;
      }
    }
    return schedule;
  };

  const canEdit = () => {
    return viewMode === 'proposal' && !!proposal?.is_active;
  };

  const getProposalScheduleData = (): Array<{ switch_date: string; parent_after: string }> => {
    if (proposal?.schedule_data) {
      try {
        return JSON.parse(proposal.schedule_data);
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleDateClick = async (date: Date, dayInfo: DayInfo) => {
    if (!canEdit()) return;
    setSelectedDate(date);
    setSelectedDayInfo(dayInfo);
    setDatePickerOpen(true);
  };

  const handleDragStart = (date: Date, dayInfo: DayInfo) => {
    setDraggedDate(date);
    setDraggedDayInfo(dayInfo);
  };

  const handleDragEnd = () => {
    setDraggedDate(null);
    setDraggedDayInfo(null);
  };

  const handleDrop = async (targetDate: Date, targetDayInfo: DayInfo) => {
    if (!canEdit() || !draggedDate) return;
    const currentData = getProposalScheduleData();
    const draggedDateStr = formatDate(draggedDate);
    const targetDateStr = formatDate(targetDate);
    const existingSwitch = currentData.find(s => s.switch_date === draggedDateStr);
    if (!existingSwitch) return;
    if (targetDayInfo.isSwitch) { handleDragEnd(); return; }
    const newData = currentData
      .filter(s => s.switch_date !== draggedDateStr)
      .concat({ switch_date: targetDateStr, parent_after: existingSwitch.parent_after })
      .sort((a, b) => a.switch_date.localeCompare(b.switch_date));
    setSaving(true);
    try {
      await updateProposal('update_schedule', { schedule_data: newData });
      await loadData();
    } catch (error) {
      console.error('Failed to move switch:', error);
      setSaving(false);
    }
    handleDragEnd();
  };

  const handleToggleSwitch = async (parentAfter: 'Jennifer' | 'Klas') => {
    if (!selectedDate || !canEdit()) return;
    const dateStr = formatDate(selectedDate);
    const currentData = getProposalScheduleData();
    const existingIndex = currentData.findIndex(s => s.switch_date === dateStr);
    let newData: Array<{ switch_date: string; parent_after: string }>;
    if (existingIndex >= 0) {
      if (currentData[existingIndex].parent_after === parentAfter) {
        newData = currentData.filter((_, i) => i !== existingIndex);
      } else {
        newData = [...currentData];
        newData[existingIndex] = { switch_date: dateStr, parent_after: parentAfter };
      }
    } else {
      newData = [...currentData, { switch_date: dateStr, parent_after: parentAfter }];
    }
    newData.sort((a, b) => a.switch_date.localeCompare(b.switch_date));
    setSaving(true);
    try {
      await updateProposal('update_schedule', { schedule_data: newData });
      await loadData();
    } catch (error) {
      console.error('Failed to update schedule:', error);
      setSaving(false);
    }
    setDatePickerOpen(false);
    setSelectedDate(null);
    setSelectedDayInfo(null);
  };

  const handleRemoveSwitch = async () => {
    if (!selectedDate || !canEdit()) return;
    const dateStr = formatDate(selectedDate);
    const currentData = getProposalScheduleData();
    const newData = currentData.filter(s => s.switch_date !== dateStr);
    setSaving(true);
    try {
      await updateProposal('update_schedule', { schedule_data: newData });
      await loadData();
    } catch (error) {
      console.error('Failed to remove switch:', error);
      setSaving(false);
    }
    setDatePickerOpen(false);
    setSelectedDate(null);
    setSelectedDayInfo(null);
  };

  const handleCreateProposal = async () => {
    setSaving(true);
    try {
      await updateProposal('create');
      await loadData();
      setViewMode('proposal');
    } catch (error) {
      console.error('Failed to create proposal:', error);
      setSaving(false);
    }
  };

  const handleDeleteProposal = async () => {
    setSaving(true);
    try {
      await updateProposal('delete');
      await loadData();
      setViewMode('confirmed');
    } catch (error) {
      console.error('Failed to delete proposal:', error);
      setSaving(false);
    }
  };

  const handleSuggestProposal = async () => {
    setSaving(true);
    try {
      await updateProposal('suggest');
      await loadData();
    } catch (error) {
      console.error('Failed to suggest proposal:', error);
      setSaving(false);
    }
  };

  const handleAcceptProposal = async () => {
    setSaving(true);
    try {
      await updateProposal('accept');
      await loadData();
      setViewMode('confirmed');
      setAcceptModalOpen(false);
    } catch (error) {
      console.error('Failed to accept proposal:', error);
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      await updateProposal('add_comment', { comment: newComment.trim() });
      setNewComment('');
      await loadData();
    } catch (error) {
      console.error('Failed to add comment:', error);
      setSaving(false);
    }
  };

  const handleResetToConfirmed = async () => {
    const scheduleData = schedule.map(s => ({ switch_date: s.switch_date, parent_after: s.parent_after }));
    setSaving(true);
    try {
      await updateProposal('update_schedule', { schedule_data: scheduleData });
      await loadData();
    } catch (error) {
      console.error('Failed to reset:', error);
      setSaving(false);
    }
  };

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

  const displaySchedule = getDisplaySchedule();
  const isEditing = canEdit();
  const hasProposal = !!proposal?.is_active;

  return (
    <CssVarsProvider theme={theme} defaultMode="dark">
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Sheet component="header" sx={{ p: { xs: 1.5, md: 2 }, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 100 }}>
          <Container maxWidth="md">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography level="h4" sx={{ fontSize: { xs: '1.1rem', md: '1.5rem' } }}>Pojkarnas Schema</Typography>
                {saving && <CircularProgress size="sm" sx={{ '--CircularProgress-size': '16px' }} />}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 1 } }}>
                <Button size="sm" variant={viewMode === 'confirmed' ? 'solid' : 'plain'} onClick={() => setViewMode('confirmed')} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Bestämt</Button>
                {hasProposal && (
                  <Button size="sm" variant={viewMode === 'proposal' ? 'solid' : 'plain'} onClick={() => setViewMode('proposal')} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    Förslag {comments.length > 0 && <Box component="span" sx={{ ml: 0.5, bgcolor: 'primary.500', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{comments.length}</Box>}
                  </Button>
                )}
                {!hasProposal && <Button size="sm" variant="soft" onClick={handleCreateProposal}>Skapa Förslag</Button>}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography level="body-sm" sx={{ display: { xs: 'none', sm: 'block' } }}>{user.username}</Typography>
                <Button variant="plain" size="sm" onClick={handleLogout}>Logga ut</Button>
              </Box>
            </Box>
            {viewMode === 'proposal' && hasProposal && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.softBg', borderRadius: 'sm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography level="body-xs" sx={{ color: 'warning.plainColor' }}>
                  {proposal?.last_updated_by === user.username 
                    ? `Skickat till ${user.username === 'Klas' ? 'Jennifer' : 'Klas'}`
                    : `${proposal?.last_updated_by} har föreslagit ändringar`
                  }
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton size="sm" variant="outlined" onClick={() => setHelpOpen(true)} sx={{ color: 'warning.plainColor', borderColor: 'warning.plainColor', minWidth: 24, minHeight: 24, width: 24, height: 24, borderRadius: '50%', fontSize: '0.75rem', fontWeight: 'bold' }}>?</IconButton>
                  <Button size="sm" variant="outlined" onClick={() => setCommentsOpen(true)} sx={{ fontSize: '0.75rem', color: 'warning.plainColor', borderColor: 'warning.plainColor' }}>Kommentarer {comments.length > 0 && '(' + comments.length + ')'}</Button>
                  <Dropdown>
                    <MenuButton size="sm" variant="outlined" sx={{ color: 'warning.plainColor', borderColor: 'warning.plainColor', fontSize: '0.75rem' }}>Åtgärder...</MenuButton>
                    <Menu placement="bottom-end" size="sm">
                      <MenuItem onClick={handleResetToConfirmed}><ListItemDecorator>🔄</ListItemDecorator>Återställ till Bestämt</MenuItem>
                      <MenuItem onClick={handleDeleteProposal} color="danger"><ListItemDecorator>🗑️</ListItemDecorator>Ta bort förslag</MenuItem>
                    </Menu>
                  </Dropdown>
                  {proposal?.last_updated_by === user.username ? (
                    <Button size="sm" variant="solid" color="warning" onClick={handleSuggestProposal} sx={{ fontSize: '0.75rem' }}>Skicka igen</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="solid" color="warning" onClick={handleSuggestProposal} sx={{ fontSize: '0.75rem' }}>Föreslå</Button>
                      <Button size="sm" variant="solid" color="success" onClick={() => setAcceptModalOpen(true)} sx={{ fontSize: '0.75rem' }}>Bekräfta</Button>
                    </>
                  )}
                </Box>
              </Box>
            )}
          </Container>
        </Sheet>
        <Box component="main" sx={{ flex: 1, py: { xs: 1, md: 3 } }}>
          <Container maxWidth="md">
            <YearCalendar schedule={displaySchedule} isEditable={isEditing} onDateClick={handleDateClick} draggedDate={draggedDate} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} onStatsCalculated={setStats} />
          </Container>
        </Box>
        <Sheet component="footer" sx={{ p: { xs: 1, md: 2 }, borderTop: '1px solid', borderColor: 'divider' }}>
          <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography level="body-xs" sx={{ color: 'neutral.500' }}><Box component="span" sx={{ color: 'rgb(244, 114, 182)' }}>Jennifer {stats.jenniferPercent}%</Box> · <Box component="span" sx={{ color: 'rgb(96, 165, 250)' }}>Klas {stats.klasPercent}%</Box></Typography>
            <Typography level="body-xs" sx={{ color: 'neutral.500' }}>© {new Date().getFullYear()} Ehnemark</Typography>
          </Container>
        </Sheet>
        <Modal open={datePickerOpen} onClose={() => { setDatePickerOpen(false); setSelectedDayInfo(null); }}>
          <ModalDialog size="sm">
            <ModalClose />
            <Typography level="title-md">{selectedDate?.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</Typography>
            {selectedDate && selectedDayInfo && (
              <Box sx={{ mt: 2 }}>
                {selectedDayInfo.isSwitch ? (
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    <Typography level="body-sm" sx={{ mb: 1, color: 'neutral.400' }}>Detta är en växlingsdag. Dra för att flytta, eller ta bort.</Typography>
                    <Button variant="soft" color="danger" onClick={handleRemoveSwitch}>Ta bort växling</Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                    <Typography level="body-sm" sx={{ mb: 1, color: 'neutral.400' }}>Lägg till en växling till:</Typography>
                    {selectedDayInfo.parent === 'Jennifer' ? (
                      <Button variant="soft" onClick={() => handleToggleSwitch('Klas')} sx={{ bgcolor: 'rgba(96, 165, 250, 0.2)', color: 'rgb(96, 165, 250)' }}>Växla till Klas</Button>
                    ) : (
                      <Button variant="soft" onClick={() => handleToggleSwitch('Jennifer')} sx={{ bgcolor: 'rgba(244, 114, 182, 0.2)', color: 'rgb(244, 114, 182)' }}>Växla till Jennifer</Button>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </ModalDialog>
        </Modal>
        <Modal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <ModalDialog size="md">
            <ModalClose />
            <Typography level="title-lg" sx={{ mb: 2 }}>Hur man redigerar schemat</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography level="title-sm" sx={{ color: 'primary.400' }}>Flytta en växlingsdag</Typography><Typography level="body-sm">Dra en dag med ring till ett nytt datum.</Typography></Box>
              <Box><Typography level="title-sm" sx={{ color: 'primary.400' }}>Ta bort en växlingsdag</Typography><Typography level="body-sm">Klicka på en dag med ring och välj Ta bort.</Typography></Box>
              <Box><Typography level="title-sm" sx={{ color: 'primary.400' }}>Lägg till en växlingsdag</Typography><Typography level="body-sm">Klicka på en vanlig dag för att lägga till en växling.</Typography></Box>
              <Box><Typography level="title-sm" sx={{ color: 'primary.400' }}>Kommentarer</Typography><Typography level="body-sm">Diskutera ändringar med den andra föräldern.</Typography></Box>
              <Box><Typography level="title-sm" sx={{ color: 'success.400' }}>Godkänn</Typography><Typography level="body-sm">När ni är överens, klicka Godkänn.</Typography></Box>
            </Box>
            <Button sx={{ mt: 2 }} onClick={() => setHelpOpen(false)}>Stäng</Button>
          </ModalDialog>
        </Modal>
        <Modal open={commentsOpen} onClose={() => setCommentsOpen(false)}>
          <ModalDialog size="md" sx={{ maxHeight: '80vh', overflow: 'auto' }}>
            <ModalClose />
            <Typography level="title-lg" sx={{ mb: 2 }}>Kommentarer</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2, maxHeight: '40vh', overflow: 'auto' }}>
              {comments.length === 0 ? (
                <Typography level="body-sm" sx={{ color: 'neutral.500', fontStyle: 'italic' }}>Inga kommentarer ännu.</Typography>
              ) : comments.map((c) => (
                <Box key={c.id} sx={{ p: 1.5, bgcolor: c.author === user.username ? 'primary.softBg' : 'neutral.softBg', borderRadius: 'sm' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography level="body-xs" sx={{ fontWeight: 'bold' }}>{c.author}</Typography>
                    <Typography level="body-xs" sx={{ color: 'neutral.500' }}>{new Date(c.created_at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Typography>
                  </Box>
                  <Typography level="body-sm">{c.comment}</Typography>
                </Box>
              ))}
            </Box>
            <Textarea placeholder="Skriv en kommentar..." value={newComment} onChange={(e) => setNewComment(e.target.value)} minRows={2} sx={{ mb: 1 }} />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setCommentsOpen(false)}>Stäng</Button>
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>Skicka</Button>
            </Box>
          </ModalDialog>
        </Modal>
        <Modal open={acceptModalOpen} onClose={() => setAcceptModalOpen(false)}>
          <ModalDialog size="md">
            <ModalClose />
            <Typography level="title-lg" sx={{ mb: 2 }}>Godkänn förslag</Typography>
            <Typography level="body-md" sx={{ mb: 3 }}>Är du säker? Det kommer att ersätta det bekräftade schemat.</Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" color="neutral" onClick={() => setAcceptModalOpen(false)}>Avbryt</Button>
              <Button variant="solid" color="success" onClick={handleAcceptProposal}>Ja, godkänn</Button>
            </Box>
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
}

export default App;
