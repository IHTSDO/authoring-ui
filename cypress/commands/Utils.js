class Utils {
    constructor() {
        this.branch = 'MAIN';
        this.project = '';
        this.task = '';
        this.loginTimeoutInSeconds = 30000;
        this.dropDownTimeoutInSeconds = 30000;
    }

    login(url, username, password) {
        cy.clearAllCookies();
        cy.visit(url);
        
        // Check if we get redirected to IMS for authentication
        cy.url().then((currentUrl) => {
            if (currentUrl.includes('ims.ihtsdotools.org')) {
                // Extract the subdomain (e.g., 'dev' from 'dev-ims.ihtsdotools.org')
                const imsOrigin = new URL(currentUrl).origin;
                
                // Handle cross-origin authentication
                cy.origin(imsOrigin, { args: { username, password } }, ({ username, password }) => {
                    cy.contains('Username');
                    cy.get('#username').clear();
                    cy.get('#username').type(username);
                    cy.get('#password').clear();
                    cy.get('#password').type(password, {log: false});
                    cy.get('button#submit').click({force: true});
                });
                
                // After authentication, we should be redirected back to the original domain
                cy.url().should('include', '.ihtsdotools.org');
            } else {
                // Handle local authentication (if no redirect occurs)
                cy.contains('Username');
                cy.get('#username').clear();
                cy.get('#username').type(username);
                cy.get('#password').clear();
                cy.get('#password').type(password, {log: false});
                cy.get('button#submit', {timeout: this.loginTimeoutInSeconds}).click({force: true});
            }
        });
    }

    logout() {
        cy.contains('Logout').click();
        cy.clearAllCookies();
    }
}

module.exports = Utils; 