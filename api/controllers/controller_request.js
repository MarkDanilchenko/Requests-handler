// --------------------------------------CONTROLLER_CONFIG
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { User, TokenBlacklist, UserRole, UserRequest } = require('../models/db_orm.js');
const { Op } = require('sequelize');
const JWT = require('jsonwebtoken');
const { jwt_config } = require('../services/jwt_config.js');

// --------------------------------------CONTROLLER
class RequestController {
	async createRequest(req, res) {
		// #swagger.tags = ['Users requests']
		// #swagger.summary = 'Create a new request by User end-point.'
		// #swagger.description = 'This is the end-point for creating a new request by User.'
		// #swagger.operationId = 'createRequest'
		// #swagger.security = [{"bearerAuth": []}]
		/*
        #swagger.requestBody = {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/CreateRequest_schema'
                    }
                }
            }
        }
        */
		/*
        #swagger.responses[201] = {
            description: 'Created',
            content:{
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['message'],
                        properties: {
                            message: {
                                type: 'string',
                                format: 'string',
                                example: 'Request created successfully!',
                                description: 'Message of the successful creation of the request response',
                            }
                        }
                    }
                }
            }
        }
        #swagger.responses[403] = {
            description: 'Forbidden',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error403_schema'
                    }
                }
            }
        }
        #swagger.responses[422] = {
            description: 'Unprocessable entity',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error422_schema'
                    }
                }
            } 
        }
        #swagger.responses[500] = {
            description: 'Internal server error',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error500_schema'
                    }
                }
            }
        }
		 */
		try {
			const decodedToken = JWT.decode(req.headers.authorization.split(' ')[1]);
			const username = decodedToken.username;
			const email = decodedToken.email;
			const role = await UserRole.findOne({ where: { id: decodedToken.role } }).then((result) => {
				return result.role;
			});
			if (role === 'admin') {
				throw new Error('Only users can create requests!');
			}
			await User.findOne({
				where: {
					[Op.and]: [{ username: username }, { email: email }],
				},
			}).then((result) => {
				UserRequest.create({
					message: req.body.request_message,
					created_by: result.id,
				})
					.then(() => {
						res.status(201);
						res.json({ message: 'Request was created successfully!' });
						res.end();
						return;
					})
					.catch((error) => {
						res.status(500);
						res.json({ message: error.message });
						res.end();
						return;
					});
			});
		} catch (error) {
			if (error.message === 'Only users can create requests!') {
				res.status(403);
				res.json({ message: error.message });
				res.end();
				return;
			}

			res.status(500);
			res.json({ message: error.message });
			res.end();
			return;
		}
	}
}

// --------------------------------------EXPORT
module.exports = new RequestController();