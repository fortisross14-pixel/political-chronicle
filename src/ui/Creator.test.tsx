// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Creator } from './Creator';

afterEach(cleanup);

describe('<Creator>', () => {
  it('blocks submit until a name is entered, then returns a valid character', () => {
    const onCreate = vi.fn();
    render(<Creator onCreate={onCreate} onCancel={() => {}} />);

    const start = screen.getByRole('button', { name: 'Start career' }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    expect(screen.getByText('Enter a name.')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/Sam Ortega/), { target: { value: 'Riley Chen' } });
    fireEvent.click(screen.getByRole('button', { name: /^Lawyer/ }));
    fireEvent.change(screen.getByLabelText('Your city'), { target: { value: 'ny-wny' } });
    fireEvent.change(screen.getByLabelText('Home state'), { target: { value: 'TX' } });
    expect(start.disabled).toBe(false);

    fireEvent.click(start);
    expect(onCreate).toHaveBeenCalledOnce();
    expect(onCreate.mock.calls[0]![0]).toMatchObject({ name: 'Riley Chen', backgroundId: 'lawyer', residentRegionId: 'ny-wny', homeState: 'TX' });
  });

  it('clearing the skills shows the points left and disables submit', () => {
    render(<Creator onCreate={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Sam Ortega/), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('11 of 11 points left')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Start career' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Raise Charisma' }));
    expect(screen.getByText('10 of 11 points left')).toBeTruthy();
  });
});
