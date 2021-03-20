import config from "../config.mjs";

export default class RestError extends Error {
    constructor(message, statusCode = 500, cause = null) {
        super(message);

        Error.captureStackTrace(this, RestError);

        this.statusCode = statusCode;
        this.cause = cause;
    }

    toResponse() {
        return {
            success: false,
            message: this.message,
            statusCode: this.statusCode,
            stack: config.dev ? this.stack : undefined,
            cause: config.dev ? this.cause : undefined
        };
    }
}

class BadRequestError extends RestError {
    constructor(message = "Bad request", cause = null) {
        super(message, 400, cause);
    }
}

class UnauthorizedError extends RestError {
    constructor(message = "Unauthorized", cause = null) {
        super(message, 401, cause);
    }
}

class ForbiddenError extends RestError {
    constructor(message = "Forbidden", cause = null) {
        super(message, 403, cause);
    }
}

class NotFoundError extends RestError {
    constructor(message = "Not found", cause = null) {
        super(message, 404, cause);
    }
}

class RateLimitError extends RestError {
    constructor(message = "Rate limit", cause = null) {
        super(message, 429, cause);
    }
}

export { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, RateLimitError };
