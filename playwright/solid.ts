import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export const config = {
    serverUrl: 'http://localhost:3000',
    account: 'alice',
    name: 'Alice Cooper',
    email: 'alice@example.com',
    password: 'secret',
};

export function serverUrl(path: string = ''): string {
    return config.serverUrl + path;
}

export function podUrl(path: string = ''): string {
    return serverUrl(`/${config.account}${path}`);
}

export function webId(): string {
    return podUrl('/profile/card#me');
}

export async function solidLogin(page: Page): Promise<void> {
    // Wait for the redirect to the Solid Server
    await page.waitForURL(new RegExp('^' + serverUrl()));

    // Check if we are already logged in on the identity provider
    const isAlreadyLoggedIn = await page.getByText(webId()).isVisible();
    if (!isAlreadyLoggedIn) {
        await page.fill('#email', config.email);
        await page.fill('#password', config.password);
        await page.click('button:has-text("Log in")');
        await expect(page.getByText(webId())).toBeVisible();
    }

    // Authorize
    await page.waitForTimeout(200);
    await page.click('button:has-text("Authorize")');
    await page.waitForTimeout(200);

    // Wait to return to the app
    await page.waitForURL('http://localhost:5001/**');
}

export async function solidReset(): Promise<void> {
    await resetPod();
}

import { authenticate, resetAuthentication } from './auth';
import { requireEngine, setEngine } from 'soukai';
import { SolidContainer, SolidEngine, bootSolidModels } from 'soukai-solid';

function defaultPodDocuments(): string[] {
    return [podUrl('/'), podUrl('/profile/'), podUrl('/profile/card'), podUrl('/README')];
}

async function deleteContainer(container: SolidContainer): Promise<void> {
    await Promise.all(
        (container.resourceUrls as string[]).map(async (url) => {
            if (url.endsWith('/')) {
                const childContainer = await SolidContainer.findOrFail(url);
                await deleteContainer(childContainer);
                return;
            }
            await deleteDocument(url);
        }),
    );
    await deleteDocument(container.url);
}

async function deleteDocument(url: string): Promise<void> {
    if (defaultPodDocuments().includes(url)) {
        return;
    }
    const authenticatedFetch = requireEngine<SolidEngine>().getFetch();
    await authenticatedFetch(url, { method: 'DELETE' });
}

async function replaceDocument(url: string, body: string): Promise<void> {
    const authenticatedFetch = requireEngine<SolidEngine>().getFetch();
    await authenticatedFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' },
        body,
    });
}

export async function resetPod(retry: boolean = true): Promise<void> {
    const authenticatedFetch = await authenticate();

    bootSolidModels();
    setEngine(new SolidEngine(authenticatedFetch));

    try {
        const authenticatedFetchForCheck = requireEngine<SolidEngine>().getFetch();

        try {
            const rootContainer = await SolidContainer.findOrFail(podUrl('/'));
            await Promise.all(
                (rootContainer.resourceUrls as string[]).map(async (url) => {
                    if (url.endsWith('/')) {
                        const childContainer = await SolidContainer.findOrFail(url);
                        await deleteContainer(childContainer);
                        return;
                    }
                    await deleteDocument(url);
                }),
            );
        } catch (err) {
            // Ignore if it fails to find or iterate.
        }

        const meRes = await authenticatedFetchForCheck(podUrl('/profile/card'), { method: 'HEAD' });
        if (meRes.ok) {
            await authenticatedFetchForCheck(podUrl('/profile/card'), { method: 'DELETE' });
        }

        await replaceDocument(
            podUrl('/profile/card'),
            `
                @prefix foaf: <http://xmlns.com/foaf/0.1/>.
                @prefix solid: <http://www.w3.org/ns/solid/terms#>.

                <> a foaf:PersonalProfileDocument;
                    foaf:maker <#me>;
                    foaf:primaryTopic <#me>.
                <#me> a foaf:Person;
                    foaf:name "${config.name}";
                    solid:oidcIssuer <${serverUrl('/')}>.
            `,
        );
    } catch (error) {
        if (!retry) {
            throw error;
        }

        resetAuthentication();
        await resetPod(false);
    }
}

export async function solidRequest(url: string, init?: RequestInit): Promise<Response> {
    const authenticatedFetch = await authenticate();
    return authenticatedFetch(url, init);
}

export async function solidCreateContainer(path: string, name: string = 'Container'): Promise<void> {
    const containerUrl = podUrl(path);

    await solidRequest(containerUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': 'text/turtle',
            'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
            'If-None-Match': '*',
        },
    });

    await solidRequest(`${containerUrl}.meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: `INSERT DATA { <${containerUrl}> <http://www.w3.org/2000/01/rdf-schema#label> "${name}" . }`,
    });
}

function applyReplacements(text: string, replacements: Record<string, string> = {}): string {
    let result = text;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), value);
    }
    return result;
}

export async function solidCreateDocument(
    path: string,
    turtleOrFixture: string,
    replacements: Record<string, string> = {},
): Promise<Response> {
    let body = turtleOrFixture;
    const fixturePath = resolve(__dirname, 'fixtures', turtleOrFixture);
    if (existsSync(fixturePath)) {
        body = readFileSync(fixturePath, 'utf-8');
    }
    return solidRequest(podUrl(path), {
        method: 'PUT',
        headers: { 'Content-Type': 'text/turtle' },
        body: applyReplacements(body, replacements),
    });
}

export async function solidDeleteDocument(path: string): Promise<Response> {
    return solidRequest(podUrl(path), { method: 'DELETE' });
}

export async function solidReadDocument(path: string): Promise<string> {
    const response = await solidRequest(podUrl(path));
    return response.text();
}

import { normalizeSparql } from '@noeldemartin/solid-utils';

export async function solidUpdateDocument(
    path: string,
    sparqlOrFixture: string,
    replacements: Record<string, string> = {},
): Promise<Response> {
    let body = sparqlOrFixture;
    const fixturePath = resolve(__dirname, 'fixtures', sparqlOrFixture);
    if (existsSync(fixturePath)) {
        body = readFileSync(fixturePath, 'utf-8');
    }
    return solidRequest(podUrl(path), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/sparql-update' },
        body: normalizeSparql(applyReplacements(body, replacements)),
    });
}

export async function fixture(path: string): Promise<string> {
    return readFileSync(resolve(__dirname, 'fixtures', path), 'utf-8');
}
