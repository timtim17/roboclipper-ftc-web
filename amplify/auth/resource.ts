import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: {
        userInvitation: {
            emailSubject: 'RoboClipper for FTCLive - Account Created',
            emailBody: (user, code) => `An account was created for you for RoboClipper.<br>https://clip.ftc.tools<br>Login with username ${user()} and temporary password ${code()}.`,
        },
    },
  },
});
