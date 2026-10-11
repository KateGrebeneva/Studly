import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the landing page', () => {
  render(<App />);
  expect(screen.getByText('УЧЁБА')).toBeInTheDocument();
  expect(screen.getAllByText(/Создать аккаунт/i).length).toBeGreaterThan(0);
});
