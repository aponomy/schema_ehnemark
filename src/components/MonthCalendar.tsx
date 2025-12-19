import { Box, Grid, Tooltip, Typography } from '@mui/joy';
import {
    DAY_NAMES,
    formatDate,
    getCalendarDays,
    getDayInfo,
    MONTH_NAMES,
} from '../api';
import type { DayComment, DayInfo, Schedule } from '../types';

interface MonthCalendarProps {
  year: number;
  month: number;
  schedule: Schedule[];
  isEditable?: boolean;
  onDateClick?: (date: Date, dayInfo: DayInfo) => void;
  draggedDate?: Date | null;
  onDragStart?: (date: Date, dayInfo: DayInfo) => void;
  onDragEnd?: () => void;
  onDrop?: (targetDate: Date, targetDayInfo: DayInfo) => void;
  dayComments?: DayComment[];
}

export function MonthCalendar({ 
  year, 
  month, 
  schedule, 
  isEditable, 
  onDateClick,
  draggedDate,
  onDragStart,
  onDragEnd,
  onDrop,
  dayComments = [],
}: MonthCalendarProps) {
  const days = getCalendarDays(year, month);

  const getDayComment = (date: Date): DayComment | undefined => {
    const dateStr = formatDate(date);
    return dayComments.find(c => c.date === dateStr);
  };

  const handleDragStart = (e: React.DragEvent, date: Date, dayInfo: DayInfo) => {
    if (!isEditable || !dayInfo.isSwitch || !dayInfo.isCurrentMonth) return;
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(date, dayInfo);
  };

  const handleDragOver = (e: React.DragEvent, dayInfo: DayInfo) => {
    if (!isEditable || !draggedDate || !dayInfo.isCurrentMonth) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date, dayInfo: DayInfo) => {
    e.preventDefault();
    if (!isEditable || !draggedDate || !dayInfo.isCurrentMonth) return;
    onDrop?.(date, dayInfo);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <Box sx={{ mb: { xs: 1, md: 2 } }}>
      <Typography
        level="title-md"
        sx={{
          mb: 0.5,
          color: 'danger.500',
          fontWeight: 'bold',
          fontSize: { xs: '0.85rem', md: '1rem' },
        }}
      >
        {MONTH_NAMES[month]}
      </Typography>
      
      {/* Day headers */}
      <Grid container spacing={0} sx={{ mb: 0.25 }}>
        {DAY_NAMES.map((day, i) => (
          <Grid key={i} xs={12 / 7}>
            <Typography
              level="body-xs"
              sx={{
                textAlign: 'center',
                color: 'neutral.500',
                fontWeight: 'bold',
                fontSize: { xs: '0.6rem', md: '0.7rem' },
              }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar grid */}
      <Grid container spacing={0}>
        {days.map((date, i) => {
          const dayInfo = getDayInfo(date, month, schedule);
          const isJennifer = dayInfo.parent === 'Jennifer';
          const isKlas = dayInfo.parent === 'Klas';
          const isToday = date.toDateString() === new Date().toDateString();
          const isDragging = draggedDate?.toDateString() === date.toDateString();
          const canDrag = isEditable && dayInfo.isSwitch && dayInfo.isCurrentMonth;
          const canDrop = isEditable && draggedDate && dayInfo.isCurrentMonth && !dayInfo.isSwitch;
          const dayComment = getDayComment(date);

          const dayContent = (
            <Box
              draggable={canDrag}
              onDragStart={(e) => handleDragStart(e, date, dayInfo)}
              onDragOver={(e) => handleDragOver(e, dayInfo)}
              onDrop={(e) => handleDrop(e, date, dayInfo)}
              onDragEnd={handleDragEnd}
              onClick={() => isEditable && dayInfo.isCurrentMonth && onDateClick?.(date, dayInfo)}
              sx={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: { xs: '0.6rem', md: '0.75rem' },
                color: dayInfo.isCurrentMonth ? 'text.primary' : 'neutral.600',
                bgcolor: isJennifer
                  ? 'rgba(244, 114, 182, 0.3)'
                  : isKlas
                  ? 'rgba(96, 165, 250, 0.3)'
                  : 'transparent',
                borderRadius: dayInfo.isSwitch ? '50%' : 0,
                border: dayComment && dayInfo.isCurrentMonth
                  ? '2px solid white'
                  : dayInfo.isSwitch
                  ? '2px solid'
                  : canDrop ? '2px dashed' : 'none',
                borderColor: dayComment && dayInfo.isCurrentMonth
                  ? 'white'
                  : dayInfo.isSwitch
                  ? isJennifer
                    ? 'rgb(244, 114, 182)'
                    : 'rgb(96, 165, 250)'
                  : canDrop ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                fontWeight: isToday ? 'bold' : 'normal',
                cursor: canDrag ? 'grab' : isEditable && dayInfo.isCurrentMonth ? 'pointer' : 'default',
                opacity: isDragging ? 0.4 : 1,
                transition: 'all 0.15s ease',
                '&:hover': isEditable && dayInfo.isCurrentMonth ? {
                  bgcolor: canDrop ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  outline: canDrop ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                } : {},
                '&::after': isToday
                  ? {
                      content: '""',
                      position: 'absolute',
                      bottom: { xs: 1, md: 2 },
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: { xs: 3, md: 4 },
                      height: { xs: 3, md: 4 },
                      borderRadius: '50%',
                      bgcolor: 'danger.500',
                    }
                  : {},
              }}
            >
              {date.getDate()}
            </Box>
          );

          return (
            <Grid key={i} xs={12 / 7}>
              {dayComment && dayInfo.isCurrentMonth ? (
                <Tooltip 
                  title={
                    <Box>
                      <Typography level="body-xs" sx={{ fontWeight: 'bold', color: dayComment.author === 'Jennifer' ? 'rgb(244, 114, 182)' : 'rgb(96, 165, 250)' }}>
                        {dayComment.author}
                      </Typography>
                      <Typography level="body-xs">{dayComment.comment}</Typography>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  {dayContent}
                </Tooltip>
              ) : dayContent}
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
