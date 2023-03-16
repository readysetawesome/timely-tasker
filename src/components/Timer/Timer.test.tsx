import { render, screen } from '@testing-library/react';
import Timer from './Timer';

test('renders learn react link', () => {
  render(<Timer />);
  const linkElement = screen.getByText(/Showing data for /i);
  expect(linkElement).toBeInTheDocument();
});
