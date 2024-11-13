import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
});

const { cfnIdentityPool, cfnUserPool } = backend.auth.resources.cfnResources;
cfnIdentityPool.allowUnauthenticatedIdentities = false;
cfnUserPool.adminCreateUserConfig = {
    ...cfnUserPool.adminCreateUserConfig,
    allowAdminCreateUserOnly: true,
};
cfnUserPool.policies = {
    passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireNumbers: false,
        requireSymbols: true,
        requireUppercase: true,
        temporaryPasswordValidityDays: 365,
    },
};
