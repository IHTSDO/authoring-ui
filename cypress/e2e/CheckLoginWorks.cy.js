const Utils = require('../commands/Utils');

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
        
        // Wait for either error message or redirect back to login
        cy.url().then((currentUrl) => {
            if (currentUrl.includes('ims.ihtsdotools.org')) {
                // If still on IMS, check for error
                const imsOrigin = new URL(currentUrl).origin;
                cy.origin(imsOrigin, () => {
                    cy.contains("Error", {timeout: 10000}).should('be.visible');
                });
            } else {
                // If redirected back, should see login form again
                cy.contains("Username").should('be.visible');
            }
        });
    });

    it('Login attempt with invalid username', () => {
        utils.login(urlAuthoring, 'Invalid username', password);
        
        cy.url().then((currentUrl) => {
            if (currentUrl.includes('ims.ihtsdotools.org')) {
                const imsOrigin = new URL(currentUrl).origin;
                cy.origin(imsOrigin, () => {
                    cy.contains("Error", {timeout: 10000}).should('be.visible');
                });
            } else {
                cy.contains("Username").should('be.visible');
            }
        });
    });

    it('Login attempt with good credentials', () => {
        utils.login(urlAuthoring, username, password);
        
        // Should be redirected back to authoring platform after successful login
        cy.url({timeout: 15000}).should('include', '.ihtsdotools.org');
        cy.contains("Authoring Platform", {timeout: 15000}).should('be.visible');
    });

    it('Logout', () => {
        // First login
        utils.login(urlAuthoring, username, password);
        cy.url({timeout: 15000}).should('include', '.ihtsdotools.org');
        
        // Then logout
        utils.logout();
        cy.contains("Username", {timeout: 10000}).should('be.visible');
    });

    it('Login attempt with good credentials', () => {
        utils.login(urlAuthoring, username, password);
        
        // Should be redirected back to authoring platform after successful login
        cy.url({timeout: 15000}).should('include', '.ihtsdotools.org');
        cy.contains("Authoring Platform", {timeout: 15000}).should('be.visible');
    });
}); 