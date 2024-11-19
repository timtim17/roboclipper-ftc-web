import { defineBackend } from '@aws-amplify/backend';
import { aws_iam as iam } from 'aws-cdk-lib';
import { auth } from './auth/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
});

const { cfnUserPool, cfnIdentityPool, cfnIdentityPoolRoleAttachment } = backend.auth.resources.cfnResources;
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
const authenticatedRole = iam.Role.fromRoleArn(backend.stack, 'AuthenticatedRole', cfnIdentityPoolRoleAttachment.roles.authenticated);
authenticatedRole.addToPrincipalPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
        'medialive:StartChannel',
        'medialive:StopChannel',
        'mediapackage:CreateHarvestJob',
        'medialive:ListChannels',
        'medialive:DescribeChannel',
        'mediapackage:ListOriginEndpoints',
        'mediapackage:DescribeChannel',
        'mediapackage:ListChannels',
        'medialive:DescribeInput',
    ],
    resources: ['*'],
}));
authenticatedRole.addToPrincipalPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
        'iam:PassRole',
    ],
    resources: ['arn:aws:iam::267253737119:role/RobotClipperStack-IAMHarvestRole03C319BB-6UVcrXeUeVYK'],
}));
