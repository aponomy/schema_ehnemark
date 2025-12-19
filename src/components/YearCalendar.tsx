import { Box, Grid, Typography } from '@mui/joy';
import { useEffect } from 'react';
import { calculateStatistics, getMonthsFromDate } from '../api';
import type { DayComment, DayInfo, Schedule } from '../types';
import { MonthCalendar } from './MonthCalendar';

interface YearCalendarProps {
  schedule: Schedule[];
  isEditable?: boolean;
  onDateClick?: (date: Date, dayInfo: DayInfo) => void;
  draggedDate?: Date | null;
  onDragStart?: (date: Date, dayInfo: DayInfo) => void;
  onDragEnd?: () => void;
  onDrop?: (targetDate: Date, targetDayInfo: DayInfo) => void;
  onStatsCalculated?: (stats: { jenniferPercent: number; klasPercent: number }) => void;
  dayComments?: DayComment[];
}

export function YearCalendar({ 
  schedule, 
  isEditable, 
  onDateClick,
  draggedDate,
  onDragStart,
  onDragEnd,
  onDrop,
  onStatsCalculated,
  dayComments = [],
}: YearCalendarProps) {
  const today = new Date();
  const months = getMonthsFromDate(today, 12); // Current month + 11 = 12 months total

  // Calculate statistics for the displayed period
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 12);
  endDate.setDate(0); // Last day of 12th month

  const stats = calculateStatistics(schedule, startDate, endDate);
  
  // Report stats to parent using useEffect to avoid infinite loop
  useEffect(() => {
    if (onStatsCalculated) {
      onStatsCalculated({ jenniferPercent: stats.jenniferPercent, klasPercent: stats.klasPercent });
    }
  }, [stats.jenniferPercent, stats.klasPercent, onStatsCalculated]);

  // Split months into groups by year
  const monthsByYear: { year: number; months: Date[] }[] = [];
  let currentYear = -1;
  
  for (const monthDate of months) {
    const year = monthDate.getFullYear();
    if (year !== currentYear) {
      monthsByYear.push({ year, months: [] });
      currentYear = year;
    }
    monthsByYear[monthsByYear.length - 1].months.push(monthDate);
  }

  return (
    <Box>
      {monthsByYear.map((yearGroup, yearIndex) => (
        <Box key={yearGroup.year}>
          {/* Year header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1, md: 3 }, mt: yearIndex > 0 ? { xs: 2, md: 4 } : 0 }}>
            <Typography level="h2" sx={{ color: 'neutral.300', fontSize: { xs: '1.5rem', md: '2rem' } }}>
              {yearGroup.year}
            </Typography>
          </Box>

          {/* Calendar grid - 4 columns on desktop, 2 on mobile */}
          <Grid container spacing={{ xs: 1, md: 3 }}>
            {yearGroup.months.map((monthDate, i) => (
              <Grid key={i} xs={6} sm={6} md={3}>
                <MonthCalendar
                  year={monthDate.getFullYear()}
                  month={monthDate.getMonth()}
                  schedule={schedule}
                  isEditable={isEditable}
                  onDateClick={onDateClick}
                  draggedDate={draggedDate}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  dayComments={dayComments}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
