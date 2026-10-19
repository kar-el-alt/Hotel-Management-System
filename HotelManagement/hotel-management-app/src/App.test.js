import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    'hotel-session',
    JSON.stringify({
      id: 'USR-001',
      name: 'Marco Dela Cruz',
      email: 'admin@marisol.test',
      role: 'Admin',
      token: 'mock-token',
    })
  );
});

test('shows Dashboard first in navigation and removes the room-status board', async () => {
  render(<App />);
  const navigation = within(screen.getByRole('navigation', { name: 'Main' }));
  expect(navigation.getAllByRole('link')[0]).toHaveTextContent('Dashboard');
  expect(navigation.getByRole('link', { name: 'Dashboard' })).toHaveClass('navbar__link--dashboard');
  fireEvent.click(navigation.getByRole('link', { name: 'Dashboard' }));
  expect(await screen.findByRole('heading', { name: 'Front desk' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Room board' })).not.toBeInTheDocument();
  expect(screen.getByText('Occupancy')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Departures due' })).toBeInTheDocument();
});
