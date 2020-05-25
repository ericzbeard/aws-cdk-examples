import { APIGatewayEvent } from 'aws-lambda';
import { Handler } from './handler';
import * as AWS from 'aws-sdk';
import { APIEventResponse } from './handler';
import { User } from './entities/user';
import { Log } from './util';

/**
 * POST /user
 * 
 * TODO - Do we really need this now other than for testing?
 */
class UserPostHandler extends Handler {

    constructor() {
        super();
    }

    /**
     * The event handler.
     */
    async handle(event: APIGatewayEvent): Promise<APIEventResponse> {
        try {

            const loggedInUser = await this.getLoggedInUser(event);


            if (event.body) {

                const user = JSON.parse(event.body) as User;

                // Make sure user is logged in as super user or this is the user being edited
                if (!(loggedInUser?.isSuperAdmin || loggedInUser?.username === user.username)) {
                    return this.failure(null, 403, 'Not authorized!');
                }

                let priorUser;
                if (user.id) {
                    priorUser = await this.db.userGet(user.id);
                }

                // Super admin can only be done manually in DynamoDB.
                // This isn't technically necessary since db does not update this field
                if ( (!priorUser && user.isSuperAdmin) ||
                     (user.isSuperAdmin && !priorUser?.isSuperAdmin) ) {

                    Log.Error(`User ${loggedInUser.username} trying to set super admin`);

                    return this.failure(null, 403, 'Not Authorized');
                }

                // Save the user
                return this.success(await this.db.userSave(user));

            } else {
                return this.failure(null, 400, 'No user submitted');
            }
        } catch (ex) {
            return this.failure(ex);
        }
    }
}

/**
 * Export the actual handler function used by Lambda.
 */
export const handler = async (event: APIGatewayEvent) => {
    const h = new UserPostHandler();
    return h.handle(event);
};