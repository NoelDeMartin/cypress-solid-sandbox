import { webId } from 'cypress-solid';

describe('template spec', () => {

    it('works', () => {
        cy.solidReset();
        cy.visit('/');
        cy.contains('Log in with Solid');
        cy.get('[aria-label="Login url"]').type(webId()).type('{enter}');
        cy.solidLogin();
        cy.contains('Hello, Alice Cooper');
    });

});
