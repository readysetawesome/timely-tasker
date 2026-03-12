import React from 'react';
import { mount } from 'cypress/react';
import InstallHint from './InstallHint';

const MAC_SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const MAC_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const LINUX_CHROME_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const stubEnv = (ua: string, standalone = false) => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'userAgent', {
      get() { return ua; },
      configurable: true,
    });
    Object.defineProperty(win.navigator, 'maxTouchPoints', {
      get() { return 0; },
      configurable: true,
    });
    Object.defineProperty(win, 'matchMedia', {
      value: () => ({ matches: standalone, addEventListener: () => {}, removeEventListener: () => {} }),
      writable: true,
      configurable: true,
    });
  });
};

describe('<InstallHint />', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clock();
  });

  it('shows Add to Dock hint on Mac Safari after delay', () => {
    stubEnv(MAC_SAFARI_UA);
    mount(<InstallHint />);
    cy.tick(1500);
    cy.get('.install-hint').should('be.visible').and('contain', 'Add to Dock');
    cy.get('.install-hint').should('contain', 'File');
  });

  it('dismisses on X click and saves localStorage flag', () => {
    stubEnv(MAC_SAFARI_UA);
    mount(<InstallHint />);
    cy.tick(1500);
    cy.get('.install-hint-close').click();
    cy.tick(500);
    cy.get('.install-hint').should('not.exist');
    cy.getAllLocalStorage().then((ls) => {
      const origin = Cypress.config('baseUrl') ?? '';
      expect(ls[origin]['TimelyTasker:InstallHintDismissed']).to.equal('yes');
    });
  });

  it('does not show when already dismissed', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('TimelyTasker:InstallHintDismissed', 'yes');
    });
    stubEnv(MAC_SAFARI_UA);
    mount(<InstallHint />);
    cy.tick(2000);
    cy.get('.install-hint').should('not.exist');
  });

  it('shows open-in-Safari prompt with copy link button on Mac non-Safari', () => {
    stubEnv(MAC_CHROME_UA);
    mount(<InstallHint />);
    cy.tick(1500);
    cy.get('.install-hint').should('be.visible').and('contain', 'Safari');
    cy.get('.install-hint-copy').should('contain', 'copy link');
  });

  it('copy link button writes URL to clipboard and shows confirmation', () => {
    stubEnv(MAC_CHROME_UA);
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'clipboard', {
        value: { writeText: cy.stub().as('writeText').resolves() },
        configurable: true,
      });
    });
    mount(<InstallHint />);
    cy.tick(1500);
    cy.get('.install-hint-copy').click();
    cy.get('.install-hint-copy').should('contain', '✓ copied');
    cy.get('@writeText').should('have.been.calledOnce');
    cy.tick(2100);
    cy.get('.install-hint-copy').should('contain', 'copy link');
  });

  it('shows Add to Home Screen hint with share icon on iPhone Safari', () => {
    stubEnv(IPHONE_SAFARI_UA);
    mount(<InstallHint />);
    cy.tick(1500);
    cy.get('.install-hint').should('be.visible').and('contain', 'Add to Home Screen');
    cy.get('.install-hint-share-svg').should('exist');
  });

  it('does not show when running in standalone (already installed)', () => {
    stubEnv(MAC_SAFARI_UA, true);
    mount(<InstallHint />);
    cy.tick(2000);
    cy.get('.install-hint').should('not.exist');
  });

  it('does not show on non-Apple desktop platforms', () => {
    stubEnv(LINUX_CHROME_UA);
    mount(<InstallHint />);
    cy.tick(2000);
    cy.get('.install-hint').should('not.exist');
  });
});
