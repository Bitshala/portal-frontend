import { Box, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { WeeklyData } from '../../types/student';

interface WeeklyProgressChartProps {
  weeklyData: WeeklyData[];
}

const getBarColor = (score: number): string => {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  if (score >= 40) return '#fb923c';
  if (score > 0) return '#f87171';
  return '#52525b';
};

export const WeeklyProgressChart = ({ weeklyData }: WeeklyProgressChartProps) => {
  const chartData = weeklyData.map((week) => ({
    name: `W${week.week}`,
    score: Math.round(week.totalScore * 100 / week.maxTotalScore), // Convert to percentage
    max: 100,
  }));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TrendingUp size={20} color="#fb923c" />
        <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem' }}>Weekly Progress</Typography>
      </Box>

      <Box sx={{ width: '100%', height: { xs: 250, sm: 300 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#fb923c', fontSize: 12, fontWeight: 600 }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(249,115,22,0.08)' }}
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 8,
                color: '#fafafa',
                fontSize: 13,
              }}
              labelStyle={{ color: '#fb923c', fontWeight: 600 }}
              itemStyle={{ color: '#d4d4d8' }}
              formatter={(value: number) => [`${value} / 100`, 'Score']}
              labelFormatter={(label: string) => `Week ${label.replace('W', '')}`}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};
