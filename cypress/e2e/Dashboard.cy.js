const Utils = require('../commands/Utils.js');
const utils = new Utils();

const urlAuthoring = Cypress.env('URL_AUTHORING');
const username = Cypress.env('TEST_LOGIN_USR');
const password = Cypress.env('TEST_LOGIN_PSW');

describe('Dashboard Exploration Test', () => {
    before(() => {
        // Clear cookies and local storage before each test
        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.clearAllSessionStorage();
        cy.log('Cookies, local and session storage are cleared');
    });

    it('Login', () => {
        utils.login(urlAuthoring, username, password);
        cy.intercept('GET', '**/auth').as('auth');
        cy.wait('@auth').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
        });
    });

    it('Get tasks', () => {
        cy.intercept('GET', '**/my-tasks**').as('getMyTasks');
        cy.wait('@getMyTasks').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
        });
    });

    it('Check for the platform title', () => {
        cy.get('[data-cy="platform-title"]').should('be.visible').and('contain.text', 'Authoring Platform');
    });

    it('Check for main navigation elements', () => {
        cy.get('[data-cy="main-navigation"]').should('be.visible');
    });

    it('Check for dashboard menu', () => {
        cy.get('[data-cy="dashboard-menu"]').should('be.visible');
    });

    it('Check for sidebar navigation', () => {
        cy.get('[data-cy="sidebar-navigation"]').should('be.visible');
    });

    it('Check for specific navigation items in sidebar', () => {
        cy.get('[data-cy="sidebar-my-tasks"]').should('be.visible');
        cy.get('[data-cy="sidebar-review-tasks"]').should('be.visible');
        cy.get('[data-cy="sidebar-my-projects"]').should('be.visible');
        cy.get('[data-cy="sidebar-all-projects"]').should('be.visible');
    });

    it('Check for user profile section', () => {
        cy.get('[data-cy="user-profile"]').should('be.visible');
    });

    it('Check for search functionality', () => {
        cy.get('[data-cy="search-projects-button"]').should('be.visible');
    });

    it('Navigate to Review Tasks', () => {
        cy.intercept('GET', '**/review-tasks**').as('getReviewTasks');
        cy.get('[data-cy="sidebar-review-tasks"]').click();
        cy.wait('@getReviewTasks').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
        });
        cy.url().should('include', 'review-tasks');
    });

    it('Navigate to My Projects', () => {
        cy.intercept('GET', '**/projects**').as('getMyProjects');
        cy.get('[data-cy="sidebar-my-projects"]').click();
        cy.wait('@getMyProjects').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
        });
        cy.url().should('include', 'my-projects');
    });

    it('Navigate to All Projects', () => {
        cy.intercept('GET', '**/projects**').as('getAllProjects');
        cy.get('[data-cy="sidebar-all-projects"]').click();
        cy.wait('@getAllProjects').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
        });
        cy.url().should('include', 'projects');
    });

    it('Navigate to Codesystems', () => {
        cy.intercept('GET', '**/codesystems**').as('getCodesystems');
        cy.get('[data-cy="sidebar-code-systems"]').click();
        cy.wait('@getCodesystems').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
        });
        cy.url().should('include', 'codesystems');
    });

    it('Navigate back home', () => {
        cy.intercept('GET', '**/my-tasks**').as('getMyTasks');
        cy.get('[data-cy="sidebar-my-tasks"]').click();
        cy.wait('@getMyTasks').then((interceptions) => {
            assert.equal(interceptions.response.statusCode, 200);
        });
        cy.url().should('include', 'home');
    });

    // Take a screenshot for manual verification
    it('Take a screenshot for manual verification', () => {
        cy.screenshot('dashboard-overview');
    });

});
