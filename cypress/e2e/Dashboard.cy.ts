import Utils from '../commands/Utils';

const utils = new Utils();

describe('Dashboard Exploration Test', () => {
    const urlAuthoring = Cypress.env('URL_AUTHORING');
    const username = Cypress.env('TEST_LOGIN_USR');
    const password = Cypress.env('TEST_LOGIN_PSW');

    beforeEach(() => {
        // Clear cookies and local storage before each test
        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.clearAllSessionStorage();
    });

    it('Explore dashboard after successful login', () => {
        // Setup API intercepts before login
        cy.intercept('GET', '**/my-tasks**').as('getMyTasks');
        cy.intercept('GET', '**/projects**').as('getProjects');
        cy.intercept('GET', '**/user**').as('getUserDetails');

        // First login
        utils.login(urlAuthoring, username, password);
        cy.url({timeout: 15000}).should('include', '.ihtsdotools.org');

        // Wait for key API calls to complete instead of arbitrary timeout
        cy.wait('@getMyTasks', {timeout: 15000});

        // Now check for the platform title - should be loaded after API calls
        cy.get('[data-cy="platform-title"]', {timeout: 5000}).should('be.visible');

        // Check for main navigation elements using data-cy selectors
        cy.get('[data-cy="main-navigation"]').should('be.visible');

        // Check for dashboard menu
        cy.get('[data-cy="dashboard-menu"]').should('be.visible');

        // Check for sidebar navigation
        cy.get('[data-cy="sidebar-navigation"]').should('be.visible');

        // Check for specific navigation items in sidebar
        cy.get('[data-cy="sidebar-my-tasks"]').should('be.visible');
        cy.get('[data-cy="sidebar-review-tasks"]').should('be.visible');
        cy.get('[data-cy="sidebar-my-projects"]').should('be.visible');
        cy.get('[data-cy="sidebar-all-projects"]').should('be.visible');

        // Check for user profile section
        cy.get('[data-cy="user-profile"]').should('be.visible');

        // Check for search functionality
        cy.get('[data-cy="search-projects-button"]').should('be.visible');

        // Test navigation functionality - click on My Projects
        cy.intercept('GET', '**/projects/**').as('getProjectDetails');
        cy.get('[data-cy="sidebar-my-projects"]').click();
        cy.wait('@getProjectDetails', {timeout: 10000});
        cy.url().should('include', 'my-projects');

        // Navigate back to home
        cy.get('[data-cy="sidebar-my-tasks"]').click();
        cy.wait('@getMyTasks', {timeout: 10000});
        cy.url().should('include', '#/');

        // Verify we can navigate around
        cy.url().should('include', '.ihtsdotools.org');

        // Take a screenshot for manual verification
        cy.screenshot('dashboard-overview');
    });
});
