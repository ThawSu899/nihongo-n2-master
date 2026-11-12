import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';
import { GlobalShortcutProvider } from '../src/presentation/context/GlobalShortcutContext';
import { db } from '../src/data/db/dexie-db';

describe('App Root Application Component', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  it('renders boot loader cleanly with GlobalShortcutProvider on initial render', () => {
    const html = renderToString(
      React.createElement(
        GlobalShortcutProvider,
        null,
        React.createElement(App)
      )
    );

    expect(html).toBeDefined();
    expect(html).toContain('BOOTING NIHONGO N2 MASTER...');
    expect(html).toContain('animate-spin');
  });

  it('exports App component as default', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });
});
