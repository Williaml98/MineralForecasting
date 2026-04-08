import React from 'react';
import { render, screen } from '@testing-library/react';
import { ForecastChart } from '../components/ForecastChart';
import type { ForecastPoint } from '../types';

jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    ComposedChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="composed-chart">{children}</div>
    ),
    Area: () => <div data-testid="area" />,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    CartesianGrid: () => <div />,
  };
});

const mockData: ForecastPoint[] = [
  { date: '2026-01-01', value: 100, lower80: 90, upper80: 110, lower95: 85, upper95: 115 },
  { date: '2026-02-01', value: 105, lower80: 95, upper80: 115, lower95: 90, upper95: 120 },
];

/**
 * Tests for the ForecastChart component.
 */
describe('ForecastChart', () => {
  it('renders without crashing', () => {
    render(<ForecastChart data={mockData} show80={true} show95={true} />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders chart when data is provided', () => {
    render(<ForecastChart data={mockData} show80={false} show95={false} />);
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<ForecastChart data={[]} show80={true} show95={true} />);
    expect(screen.getByText(/no forecast data/i)).toBeInTheDocument();
  });
});
