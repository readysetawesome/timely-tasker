import { render, fireEvent, getByTestId, screen } from '@testing-library/react';
import Timer from './Timer';

test('renders learn react link', () => {
  render(<Timer />);
  const linkElement = screen.getByText(/Showing data for /i);
  expect(linkElement).toBeInTheDocument();
});
/*
it("App loads with initial state of 0", () => {
  const { timer } = render(<Timer />);
  const countValue = screen.getByTestId("countvalue");

  expect(countValue.textContent).toBe("0");
});

`
const countValue = getByTestId(container, "countvalue");
const increment = getByTestId(container, "incrementButton");
const decrement = getByTestId(container, "decrementButton");
expect(countValue.textContent).toBe("0");
fireEvent.click(increment);
expect(countValue.textContent).toBe("1");
fireEvent.click(decrement);
expect(countValue.textContent).toBe("0");
`
*/
