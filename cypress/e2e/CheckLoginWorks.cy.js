const Utils = require('../commands/Utils.js');

const utils = new Utils();

describe('Authoring Platform Login/Logout Test', () => {
  const urlAuthoring = Cypress.env('URL_AUTHORING');
  const username = Cypress.env('TEST_LOGIN_USR');
  const password = Cypress.env('TEST_LOGIN_PSW');

  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
  });

  it('Login attempt with invalid password', () => {
    utils.login(urlAuthoring, username, 'Invalid Password');
    cy.contains("Error").should('be.visible');
    cy.contains("Invalid username or password").should('be.visible');
  });

  it('Login attempt with invalid username', () => {
    utils.login(urlAuthoring, 'Invalid username', password);
    cy.contains("Error").should('be.visible');
    cy.contains("Invalid username or password").should('be.visible');
  });

  it('Login attempt with good credentials', () => {
    utils.login(urlAuthoring, username, password);
    cy.contains("Authoring Platform", {timeout: 15000}).should('be.visible');
  });

  it('Logout', () => {
    utils.login(urlAuthoring, username, password);
    cy.contains("Authoring Platform", {timeout: 15000}).should('be.visible');

    utils.logout();
    cy.contains("Username", {timeout: 10000}).should('be.visible');
  });

});
