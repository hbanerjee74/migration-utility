import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import SettingsSurface from '../../routes/settings';

describe('SettingsSurface tabs', () => {
  it('does not render reset tab', () => {
    render(
      <MemoryRouter initialEntries={['/settings/workspace']}>
        <Routes>
          <Route path="/settings/*" element={<SettingsSurface />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('settings-tab-reset')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-connections')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-workspace')).toBeInTheDocument();
  });
});
