import { fetchAuthSession } from 'aws-amplify/auth';

export async function getCredentials() {
    const { credentials } = await fetchAuthSession();
    if (!credentials) throw new Error('Attempted to fetch credentials when not authenticated');
    return credentials;
}
