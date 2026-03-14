import { buildAuthenticatedFetch, createDpopHeader, generateDpopKeyPair } from '@inrupt/solid-client-authn-core';
import { config, serverUrl, webId } from './solid';
import fetch from 'node-fetch'; // or use native fetch in node >=18

function fail(message: string): never {
    throw new Error(message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function objectWithoutEmpty(obj: any): any {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != null && v !== false));
}

function isUnsuccessfulResponse(response: unknown, message?: string): response is { message?: string; name?: string } {
    return (
        typeof response === 'object' &&
        response !== null &&
        'statusCode' in response &&
        'message' in response &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Number((response as any).statusCode) % 100 !== 2 &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (!message || (response as any).message === message)
    );
}

let authenticatedFetch: typeof globalThis.fetch | null = null;

async function controlUrl(key: string, authorization?: string): Promise<string> {
    const response = await fetch(serverUrl('/.account/'), {
        headers: objectWithoutEmpty({
            Authorization: authorization && `CSS-Account-Token ${authorization}`,
        }) as Record<string, string>,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await response.json() as any;

    if (isUnsuccessfulResponse(json)) {
        throw new Error(json.message || json.name);
    }

    const url = key.split('.').reduce((controls, part) => controls[part], json.controls);

    return typeof url === 'string' ? url : fail(`'${key}' CSS control not found`);
}

async function getCredentials(authorization: string): Promise<{ id: string; secret: string }> {
    const url = await controlUrl('account.clientCredentials', authorization);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `CSS-Account-Token ${authorization}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webId: webId() }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await response.json() as any;

    if (isUnsuccessfulResponse(json)) {
        throw new Error(json.message || json.name);
    }

    return { id: json.id, secret: json.secret };
}

async function logIn(): Promise<string | null> {
    const url = await controlUrl('password.login');
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: config.email,
            password: config.password,
        }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await response.json() as any;

    if (isUnsuccessfulResponse(json, 'Invalid email/password combination.')) {
        return null;
    }

    return json.authorization;
}

async function createAccount(): Promise<string> {
    const url = await controlUrl('account.create');
    const response = await fetch(url, { method: 'POST' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await response.json() as any;

    if (isUnsuccessfulResponse(json)) {
        throw new Error(json.message || json.name);
    }

    return json.authorization;
}

async function createPassword(authorization: string): Promise<void> {
    const url = await controlUrl('password.create', authorization);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `CSS-Account-Token ${authorization}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: config.email,
            password: config.password,
        }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await response.json() as any;

    if (isUnsuccessfulResponse(json)) {
        throw new Error(json.message || json.name);
    }
}

async function createPOD(authorization: string): Promise<void> {
    const url = await controlUrl('account.pod', authorization);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `CSS-Account-Token ${authorization}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: config.account,
        }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await response.json() as any;

    if (isUnsuccessfulResponse(json)) {
        if (
            json.message?.includes('Existing containers cannot be updated via PUT') ||
            json.message?.includes('Pod creation failed')
        ) {
            // This implies the pod might have been created already and something else failed. We can ignore it safely.
            return;
        }
        throw new Error(json.message || json.name);
    }
}

async function setupAccount(): Promise<string> {
    const authorization = await createAccount();
    await createPassword(authorization);
    await createPOD(authorization);
    return authorization;
}

export function resetAuthentication(): void {
    authenticatedFetch = null;
}

export async function authenticate(): Promise<typeof globalThis.fetch> {
    if (!authenticatedFetch) {
        const authorization = (await logIn()) ?? (await setupAccount());
        const credentials = await getCredentials(authorization);
        const authString = `${encodeURIComponent(credentials.id)}:${encodeURIComponent(credentials.secret)}`;
        const tokenUrl = serverUrl('/.oidc/token');
        const dpopKey = await generateDpopKeyPair();
        const dpop = await createDpopHeader(tokenUrl, 'POST', dpopKey);
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(authString).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'DPoP': dpop,
            },
            body: 'grant_type=client_credentials&scope=webid',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = await response.json() as any;

        if (isUnsuccessfulResponse(json)) {
            throw new Error(json.message || json.name);
        }

        authenticatedFetch = (await buildAuthenticatedFetch(json.access_token, {
            dpopKey,
        })) as unknown as typeof globalThis.fetch;
    }

    return authenticatedFetch;
}
