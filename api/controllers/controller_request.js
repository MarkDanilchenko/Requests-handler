// --------------------------------------CONTROLLER_CONFIG
const dotenv = require('dotenv');
dotenv.config({ path: '../../.env' });
const { User, TokenBlacklist, UserRole, UserRequest } = require('../models/db_orm.js');
const { Op } = require('sequelize');
const JWT = require('jsonwebtoken');
const { sendEmail } = require('../services/mailer_config.js');
const nodemailer = require('nodemailer');

// --------------------------------------CONTROLLER
class RequestController {
	async createRequest(req, res) {
		// #swagger.tags = ['Users requests']
		// #swagger.summary = 'Create a new request by user end-point.'
		// #swagger.description = 'This is the end-point for creating a new request by user.'
		// #swagger.operationId = 'createRequest'
		// #swagger.security = [{"bearerAuth": []}]
		/*
        #swagger.requestBody = {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
				        required: ['message'],
				        properties: {
					        message: {
						        type: 'string',
						        format: 'string',
						        example: 'Lorem ipsum dolor sit amet consectetur, adipisicing elit. Voluptate est fugit inventore vero! Animi odio iure quasi doloremque! Odio ducimus quidem enim unde animi nostrum, ad inventore quia laboriosam beatae?',
						        description: 'Message of the request.',
					            },
				            },
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
                                description: 'Message of the successful creation of the request.',
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
                        $ref: '#/components/schemas/Error403_responseSchema'
                    }
                }
            }
        }
        #swagger.responses[422] = {
            description: 'Unprocessable entity',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error422_responseSchema'
                    }
                }
            } 
        }
        #swagger.responses[500] = {
            description: 'Internal server error',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error500_responseSchema'
                    }
                }
            }
        }
		 */
		try {
			const token = req.headers.authorization.split(' ')[1];
			await UserRole.findOne({ where: { id: JWT.decode(token).role } }).then((result) => {
				if (result.role !== 'user') {
					throw new Error('Only users can create requests!');
				}
			});
			const user = await User.findOne({
				where: {
					[Op.and]: [{ username: JWT.decode(token).username }, { email: JWT.decode(token).email }],
				},
			});
			await UserRequest.create({
				message: req.body.request_message,
				created_by: user.id,
			}).then(() => {
				res.status(201);
				res.json({ message: 'Request was created successfully!' });
				res.end();
				return;
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

	async getRequests(req, res) {
		// #swagger.tags = ['Users requests']
		// #swagger.summary = 'Get all requests end-point.'
		// #swagger.description = 'This is the end-point for getting all requests.'
		// #swagger.operationId = 'getRequests'
		// #swagger.security = [{"bearerAuth": []}]
		/*
        #swagger.parameters['page'] = {
            $ref: '#/components/parameters/PageInQuery'
        }
        #swagger.parameters['limit'] = {
            $ref: '#/components/parameters/LimitInQuery'
        }
        */
		/*
        #swagger.requestBody = {
            required: true,
            content: {
                'application/json': {
                    schema: {         
                        type: 'object',
				        required: ['request_status'],
				        properties: {
					        request_status: {
						        type: 'string',
						        format: 'string',
						        example: 'active',
						        description: 'Request status.',
						        enum: ['active', 'resolved'],
					            },
				            },
                        }
                    }
                }
            }
        */
		/*
        #swagger.responses[200] = {
            description: 'OK',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Requests_responseSchema'
                    }
                }
            }
        }
        #swagger.responses[403] = {
            description: 'Forbidden',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error403_responseSchema'
                    }
                }
            }
        }
        #swagger.responses[422] = {
            description: 'Unprocessable entity',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error422_responseSchema'
                    }
                }
            }
        }
        #swagger.responses[500] = {
            description: 'Internal server error',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error500_responseSchema'
                    }
                }
            }
        }
        */
		try {
			const request_status = req.body.request_status;
			const token = req.headers.authorization.split(' ')[1];
			await UserRole.findOne({ where: { id: JWT.decode(token).role } }).then((result) => {
				if (result.role !== 'admin') {
					throw new Error('Only admins can get requests!');
				}
			});
			const page = Number(req.query.page) || 1;
			const limit = Number(req.query.limit) || 10;
			const offset = (page - 1) * limit;
			const totalItems = await UserRequest.count({ where: { status: request_status } });
			const totalPages = Math.ceil(totalItems / limit);
			await UserRequest.findAll({ where: { status: request_status }, limit: limit, offset: offset, order: [['created_at', 'DESC']] }).then(
				(result) => {
					res.status(200);
					res.json({
						data: result,
						pageIngo: {
							currentPage: page,
							itemsPerPage: limit,
							totalItems: totalItems,
							totalPages: totalPages,
							nextPage: page < totalPages ? page + 1 : null,
							previousPage: page > 1 ? page - 1 : null,
						},
					});
					res.end();
					return;
				}
			);
		} catch (error) {
			if (error.message === 'Only admins can get requests!') {
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

	async resolveRequest(req, res) {
		// #swagger.tags = ['Users requests']
		// #swagger.summary = 'Resolve request end-point.'
		// #swagger.description = 'This is the end-point for resolving requests.'
		// #swagger.operationId = 'resolverequest'
		// #swagger.security = [{"bearerAuth": []}]
		/*
        #swagger.parameters['id'] = {
            $ref: '#/components/parameters/IDInPath'
        }
        */
		/*
        #swagger.requestBody = {
            required: true,
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['comment'],
                        properties: {
                            comment: {
                                type: 'string',
                                format: 'string',
                                example: 'Admin\'s resolution comment',
                                description: 'Admin\'s comment in the resolved request.',
                            },
                        },
                    }
                }
            }
        }
        */
		/*
        #swagger.responses[200] = {
            description: 'OK',
            content:{
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['message'],
                        properties: {
                            message: {
                                type: 'string',
                                format: 'string',
                                example: 'Request with ID: ${___} was resolved successfully! Email reply was sent to user email.',
                                description: 'Success message of resolved request.',
                            },
                            email_reply: {
                                type: 'string',
                                format: 'string',
                                example: 'https://ethereal.email/message/Z...',
                                description: 'Link to successful email reply to the user. Here is used Ethereal: email service only for testing purposes.',
                            }
                        },
                    }
                }
            }
        }
        #swagger.responses[403] = {
            description: 'Forbidden',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error403_responseSchema'
                    }
                }
            }
        }
        #swagger.responses[404] = {
            description: 'Not found',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error404_responseSchema'
                    }
                }
            }   
        }
        #swagger.responses[422] = {
            description: 'Unprocessable entity',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error422_responseSchema'
                    }
                }
            }
        }
        #swagger.responses[500] = {
            description: 'Internal server error',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error500_responseSchema'
                    }
                }
            }
        }
        */
		try {
			const token = req.headers.authorization.split(' ')[1];
			const request_id = req.params.id;
			const comment = req.body.comment;
			await UserRole.findOne({ where: { id: JWT.decode(token).role } }).then((result) => {
				if (result.role !== 'admin') {
					throw new Error('Only admins can resolve requests!');
				}
			});
			// Get admin information
			const admin = await User.findOne({
				where: { [Op.and]: [{ username: JWT.decode(token).username }, { email: JWT.decode(token).email }] },
			});
			// Get request creator (user) information
			const user = await UserRequest.findOne({ where: { id: request_id } }).then((result) => {
				return User.findOne({ where: { id: result.created_by } });
			});
			// Resolve request
			await UserRequest.update(
				{ status: 'resolved', comment: comment, updated_at: new Date(), resolved_by: admin.id },
				{ where: { id: request_id }, returning: true }
			).then((result) => {
				if (result[0] === 0) {
					throw new Error(`Request with ID: ${request_id} not found or doesn't exist.`);
				}
				const mailOptions = {
					from: process.env.SERVER_EMAIL,
					to: user.email,
					subject: `Request, ID: ${request_id}, resolved!`,
					html: `
                            <div style='text-align: center; margin-top: 25px'>
                                <h3>Hello, ${user.username}!</h3>
                                <p>Your <b>request with ID: ${request_id}</b> was <b>resolved</b> successfully! <br><br><b>Comment:</b> ${comment}</p>
                                <hr style='width: 25%; margin-left: auto; margin-right: auto'>
                            </div>
                            <div style='text-align: end; margin-top: 10px'>
                                <p>Admin: ${admin.username}</p>
                                <p>Resolved at: ${result[1][0].updated_at.toLocaleString()}</p>
                                <p><i>Thanks for using our service!</i></p>
                            </div>
                    `,
				};
				sendEmail(mailOptions)
					.then((result) => {
						res.status(200);
						res.json({
							message: `Request with ID: ${request_id} was resolved successfully! Email reply was sent to: ${user.email}.`,
							email_reply: `${nodemailer.getTestMessageUrl(result)}`,
						});
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
			if (error.message === 'Only admins can resolve requests!') {
				res.status(403);
				res.json({ message: error.message });
				res.end();
				return;
			} else if (error.message === `Request with ID: ${req.params.id} not found or doesn't exist.`) {
				res.status(404);
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

	async deleteRequest(req, res) {
		// #swagger.tags = ['Users requests']
		// #swagger.summary = 'Delete request by admin end-point.'
		// #swagger.description = 'This is the end-point for deleting requests by admins.'
		// #swagger.operationId = 'deleteRequest'
		// #swagger.security = [{"bearerAuth": []}]
		/*
        #swagger.parameters['id'] = {
           $ref: '#/components/parameters/IDInPath'   
        }
		 */
		/*
        #swagger.responses[200] = {
            description: 'OK',
            content:{
                'application/json': {
                    schema: {
                        type: 'object',
                        required: ['message'],
                        properties: {
                            message: {
                                type: 'string',
                                format: 'string',
                                example: 'Request with ID: ${___} was deleted successfully!',
                                description: 'Success message of the deleted request.',
                            },
                        },
                    }
                }
            }
        }
        #swagger.responses[403] = {
            description: 'Forbidden',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error403_responseSchema'
                    }
                }
            }
        }
        #swagger.responses[404] = {
            description: 'Not found',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error404_responseSchema'
                    }
                }
            }   
        }
        #swagger.responses[422] = {
            description: 'Unprocessable entity',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error422_responseSchema'
                    }
                }
            }
        }
        #swagger.responses[500] = {
            description: 'Internal server error',
            content:{
                'application/json': {
                    schema: {
                        $ref: '#/components/schemas/Error500_responseSchema'
                    }
                }
            }
        }
		 */
		try {
			const token = req.headers.authorization.split(' ')[1];
			const request_id = req.params.id;
			await UserRole.findOne({ where: { id: JWT.decode(token).role } }).then((result) => {
				if (result.role !== 'admin') {
					throw new Error('Only admins can delete requests!');
				}
			});
			await UserRequest.findOne({ where: { id: request_id } }).then(async (result) => {
				if (!result) {
					throw new Error(`Request with ID: ${request_id} was not deleted or doesn't exist.`);
				}
				await UserRequest.destroy({ where: { id: request_id } }).then(() => {
					res.status(200);
					res.json({ message: `Request with ID: ${request_id} was deleted successfully!` });
					res.end();
					return;
				});
			});
		} catch (error) {
			if (error.message === 'Only admins can delete requests!') {
				res.status(403);
				res.json({ message: error.message });
				res.end();
				return;
			} else if (error.message === `Request with ID: ${req.params.id} was not deleted or doesn't exist.`) {
				res.status(404);
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
