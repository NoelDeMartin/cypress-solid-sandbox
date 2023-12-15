describe('template spec', () => {

    it('works', () => {
        cy.visit('/');
        cy.contains('Log in with Solid');
    });

});
