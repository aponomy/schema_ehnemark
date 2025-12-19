import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    IconButton,
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
import type { DayComment, DayInfo, Proposal, ProposalComment, Schedule, User, ViewMode } from './types';

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
  const [dayComments, setDayComments] = useState<DayComment[]>([]);
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
  const [newComment, setNewComment] = useState('');
  const [newDayComment, setNewDayComment] = useState('');
  const [showDayCommentInput, setShowDayCommentInput] = useState(false);
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
      setSchedule(scheduleData.schedule);
      setDayComments(scheduleData.dayComments);
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

  const handleAcceptProposal = async () => {
    setSaving(true);
    try {
      await updateProposal('accept');
      await loadData();
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

  // Get day comments for the current view
  const getDisplayDayComments = (): DayComment[] => {
    if (viewMode === 'confirmed') return dayComments;
    if (proposal?.day_comments) {
      try {
        return JSON.parse(proposal.day_comments);
      } catch {
        return dayComments;
      }
    }
    return dayComments;
  };

  const getProposalDayComments = (): DayComment[] => {
    if (proposal?.day_comments) {
      try {
        return JSON.parse(proposal.day_comments);
      } catch {
        return [];
      }
    }
    return [];
  };

  // Get comment for selected date
  const getSelectedDayComment = (): DayComment | null => {
    if (!selectedDate) return null;
    const dateStr = formatDate(selectedDate);
    const comments = getDisplayDayComments();
    return comments.find(c => c.date === dateStr) || null;
  };

  const handleAddDayComment = async () => {
    if (!selectedDate || !canEdit() || !newDayComment.trim() || !user) return;
    const dateStr = formatDate(selectedDate);
    const currentComments = getProposalDayComments();
    const newComments = [...currentComments.filter(c => c.date !== dateStr), {
      date: dateStr,
      comment: newDayComment.trim(),
      author: user.username
    }];
    setSaving(true);
    try {
      await updateProposal('update_day_comments', { day_comments: newComments });
      setNewDayComment('');
      setShowDayCommentInput(false);
      await loadData();
    } catch (error) {
      console.error('Failed to add day comment:', error);
      setSaving(false);
    }
  };

  const handleRemoveDayComment = async () => {
    if (!selectedDate || !canEdit()) return;
    const dateStr = formatDate(selectedDate);
    const currentComments = getProposalDayComments();
    const newComments = currentComments.filter(c => c.date !== dateStr);
    setSaving(true);
    try {
      await updateProposal('update_day_comments', { day_comments: newComments });
      setShowDayCommentInput(false);
      await loadData();
    } catch (error) {
      console.error('Failed to remove day comment:', error);
      setSaving(false);
    }
  };

  const hasUserAccepted = () => {
    if (!proposal || !user) return false;
    return user.username === 'Jennifer' ? !!proposal.jennifer_accepted : !!proposal.klas_accepted;
  };

  const hasOtherAccepted = () => {
    if (!proposal || !user) return false;
    return user.username === 'Jennifer' ? !!proposal.klas_accepted : !!proposal.jennifer_accepted;
  };

  const getOtherUsername = () => {
    return user?.username === 'Jennifer' ? 'Klas' : 'Jennifer';
  };

  // Check if the other person was the last to update (for badge indicator)
  const hasNewFromOther = () => {
    if (!proposal || !user) return false;
    return proposal.last_updated_by !== user.username;
  };

  // Get a descriptive status message for the proposal
  const getProposalStatusMessage = () => {
    if (!proposal || !user) return '';
    const other = getOtherUsername();
    const userAccepted = hasUserAccepted();
    const otherAccepted = hasOtherAccepted();
    
    if (userAccepted && otherAccepted) {
      return 'Båda har godkänt – schemat uppdateras...';
    }
    if (userAccepted && !otherAccepted) {
      return `Du har godkänt. När ${other} också godkänner ersätts Bekräftat schema.`;
    }
    if (!userAccepted && otherAccepted) {
      return `${other} har godkänt. Godkänn du också för att ersätta Bekräftat schema.`;
    }
    // Neither has accepted
    if (proposal.last_updated_by === user.username) {
      return `Du gjorde senaste ändringen. Båda måste godkänna för att ersätta Bekräftat schema.`;
    }
    return `${other} har gjort ändringar. Båda måste godkänna för att ersätta Bekräftat schema.`;
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
                <Button size="sm" variant={viewMode === 'confirmed' ? 'solid' : 'plain'} onClick={() => setViewMode('confirmed')} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Bekräftat</Button>
                {hasProposal ? (
                  <Button 
                    size="sm" 
                    variant={viewMode === 'proposal' ? 'solid' : 'plain'} 
                    color="warning" 
                    onClick={() => setViewMode('proposal')} 
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, position: 'relative' }}
                  >
                    Förslag
                    {hasNewFromOther() && viewMode !== 'proposal' && (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: -4, 
                          right: -4, 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          bgcolor: 'danger.500',
                          border: '2px solid',
                          borderColor: 'background.surface'
                        }} 
                      />
                    )}
                  </Button>
                ) : (
                  <Button size="sm" variant="soft" color="warning" onClick={handleCreateProposal} sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}>Skapa Förslag</Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography level="body-sm" sx={{ display: { xs: 'none', sm: 'block' } }}>{user.username}</Typography>
                <Button variant="plain" size="sm" onClick={handleLogout}>Logga ut</Button>
              </Box>
            </Box>
          </Container>
        </Sheet>

        <Box component="main" sx={{ flex: 1, py: { xs: 1, md: 3 } }}>
          <Container maxWidth="md">
            {viewMode === 'proposal' && hasProposal && (
              <Sheet sx={{ mb: 2, p: 2, borderRadius: 'md', bgcolor: 'warning.softBg' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography level="title-sm" sx={{ color: 'warning.plainColor' }}>Förslag på ändringar</Typography>
                    <IconButton size="sm" variant="outlined" onClick={() => setHelpOpen(true)} sx={{ color: 'warning.plainColor', borderColor: 'warning.plainColor', minWidth: 20, minHeight: 20, width: 20, height: 20, borderRadius: '50%', fontSize: '0.65rem' }}>?</IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      size="sm" 
                      variant="soft"
                      sx={{ 
                        fontSize: '0.7rem',
                        bgcolor: proposal?.jennifer_accepted ? 'success.softBg' : 'neutral.softBg',
                        color: proposal?.jennifer_accepted ? 'success.plainColor' : 'neutral.plainColor',
                      }}
                    >
                      Jennifer {proposal?.jennifer_accepted ? '✓' : ''}
                    </Chip>
                    <Chip 
                      size="sm" 
                      variant="soft"
                      sx={{ 
                        fontSize: '0.7rem',
                        bgcolor: proposal?.klas_accepted ? 'success.softBg' : 'neutral.softBg',
                        color: proposal?.klas_accepted ? 'success.plainColor' : 'neutral.plainColor',
                      }}
                    >
                      Klas {proposal?.klas_accepted ? '✓' : ''}
                    </Chip>
                  </Box>
                </Box>
                <Typography level="body-sm" sx={{ mb: 2, color: hasOtherAccepted() && !hasUserAccepted() ? 'success.plainColor' : 'warning.plainColor' }}>
                  {getProposalStatusMessage()}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="outlined" color="danger" onClick={handleDeleteProposal} sx={{ fontSize: '0.75rem' }}>🗑️ Ta bort förslag</Button>
                  <Box sx={{ flex: 1 }} />
                  {!hasUserAccepted() ? (
                    <Button size="sm" variant="solid" color="success" onClick={handleAcceptProposal} sx={{ fontSize: '0.75rem' }}>✓ Godkänn</Button>
                  ) : null}
                </Box>
              </Sheet>
            )}
            <YearCalendar schedule={displaySchedule} isEditable={isEditing} onDateClick={handleDateClick} draggedDate={draggedDate} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} onStatsCalculated={setStats} dayComments={getDisplayDayComments()} />
            {viewMode === 'proposal' && hasProposal && (
              <Sheet sx={{ mt: 3, p: 2, borderRadius: 'md' }}>
                <Typography level="title-sm" sx={{ mb: 2 }}>Kommentarer</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, maxHeight: '300px', overflow: 'auto' }}>
                  {comments.length === 0 ? (
                    <Typography level="body-sm" sx={{ color: 'neutral.500', fontStyle: 'italic' }}>Inga kommentarer ännu.</Typography>
                  ) : comments.map((c) => (
                    <Box key={c.id} sx={{ p: 1.5, bgcolor: c.author === user.username ? 'primary.softBg' : 'neutral.softBg', borderRadius: 'sm', borderLeft: '3px solid', borderColor: c.author === 'Jennifer' ? 'rgb(244, 114, 182)' : 'rgb(96, 165, 250)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography level="body-xs" sx={{ fontWeight: 'bold', color: c.author === 'Jennifer' ? 'rgb(244, 114, 182)' : 'rgb(96, 165, 250)' }}>{c.author}</Typography>
                        <Typography level="body-xs" sx={{ color: 'neutral.500' }}>{new Date(c.created_at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Typography>
                      </Box>
                      <Typography level="body-sm">{c.comment}</Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Textarea placeholder="Skriv en kommentar..." value={newComment} onChange={(e) => setNewComment(e.target.value)} minRows={1} maxRows={3} sx={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()} sx={{ alignSelf: 'flex-end' }}>Skicka</Button>
                </Box>
              </Sheet>
            )}
          </Container>
        </Box>

        <Sheet component="footer" sx={{ p: { xs: 1, md: 2 }, borderTop: '1px solid', borderColor: 'divider' }}>
          <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography level="body-xs" sx={{ color: 'neutral.500' }}><Box component="span" sx={{ color: 'rgb(244, 114, 182)' }}>Jennifer {stats.jenniferPercent}%</Box> · <Box component="span" sx={{ color: 'rgb(96, 165, 250)' }}>Klas {stats.klasPercent}%</Box></Typography>
            <Typography level="body-xs" sx={{ color: 'neutral.500' }}>© {new Date().getFullYear()} Ehnemark</Typography>
          </Container>
        </Sheet>

        <Modal open={datePickerOpen} onClose={() => { setDatePickerOpen(false); setSelectedDayInfo(null); setNewDayComment(''); setShowDayCommentInput(false); }}>
          <ModalDialog size="sm">
            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
              {canEdit() && (
                <IconButton size="sm" variant="plain" color="neutral" onClick={() => { setDatePickerOpen(false); setShowDayCommentInput(true); }} sx={{ opacity: getSelectedDayComment() ? 1 : 0.6, '&:hover': { opacity: 1 } }}>
                  💬
                </IconButton>
              )}
              <ModalClose sx={{ position: 'static' }} />
            </Box>
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

        <Modal open={showDayCommentInput} onClose={() => { setShowDayCommentInput(false); setNewDayComment(''); }}>
          <ModalDialog size="sm">
            <ModalClose />
            <Typography level="title-md">Dagkommentar</Typography>
            <Typography level="body-sm" sx={{ color: 'neutral.400' }}>{selectedDate?.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</Typography>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {getSelectedDayComment() && (
                <Box sx={{ p: 1.5, bgcolor: 'neutral.softBg', borderRadius: 'sm', borderLeft: '3px solid', borderColor: getSelectedDayComment()?.author === 'Jennifer' ? 'rgb(244, 114, 182)' : 'rgb(96, 165, 250)' }}>
                  <Typography level="body-xs" sx={{ fontWeight: 'bold', color: getSelectedDayComment()?.author === 'Jennifer' ? 'rgb(244, 114, 182)' : 'rgb(96, 165, 250)', mb: 0.5 }}>{getSelectedDayComment()?.author}</Typography>
                  <Typography level="body-sm">{getSelectedDayComment()?.comment}</Typography>
                </Box>
              )}
              <Textarea 
                placeholder={getSelectedDayComment() ? "Ersätt kommentaren..." : "Skriv en kommentar för denna dag..."} 
                value={newDayComment} 
                onChange={(e) => setNewDayComment(e.target.value)} 
                minRows={2} 
                maxRows={4}
                autoFocus
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                {getSelectedDayComment() && (
                  <Button variant="soft" color="danger" size="sm" onClick={handleRemoveDayComment} disabled={saving}>Ta bort</Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Button variant="soft" color="neutral" size="sm" onClick={() => { setShowDayCommentInput(false); setNewDayComment(''); }}>Avbryt</Button>
                <Button variant="solid" size="sm" onClick={handleAddDayComment} disabled={!newDayComment.trim() || saving}>Spara</Button>
              </Box>
            </Box>
          </ModalDialog>
        </Modal>

        <Modal open={helpOpen} onClose={() => setHelpOpen(false)}>
          <ModalDialog size="md">
            <ModalClose />
            <Typography level="title-lg" sx={{ mb: 2 }}>Hur fungerar det?</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography level="title-sm" sx={{ color: 'primary.400' }}>Skapa förslag</Typography><Typography level="body-sm">När det inte finns något förslag kan vem som helst skapa ett. Det kopierar det bekräftade schemat.</Typography></Box>
              <Box><Typography level="title-sm" sx={{ color: 'primary.400' }}>Redigera</Typography><Typography level="body-sm">Båda kan redigera förslaget. Klicka på en dag för att lägga till/ta bort växlingar, eller dra för att flytta.</Typography></Box>
              <Box><Typography level="title-sm" sx={{ color: 'primary.400' }}>Kommentera</Typography><Typography level="body-sm">Diskutera ändringar via kommentarerna längst ner.</Typography></Box>
              <Box><Typography level="title-sm" sx={{ color: 'success.400' }}>Godkänn</Typography><Typography level="body-sm">När båda godkänt förslaget ersätter det automatiskt det bekräftade schemat.</Typography></Box>
              <Box><Typography level="title-sm" sx={{ color: 'warning.400' }}>OBS!</Typography><Typography level="body-sm">Om någon gör en ändring efter att du godkänt, återställs godkännandet och båda måste godkänna igen.</Typography></Box>
            </Box>
            <Button sx={{ mt: 2 }} onClick={() => setHelpOpen(false)}>Stäng</Button>
          </ModalDialog>
        </Modal>
      </Box>
    </CssVarsProvider>
  );
}

export default App;
