import logger from "../../libraries/log/logger.js";

// Middleware to log the request.
// Logic: by default it will log req.params and req.query if they exist.
// for the req.body, if no specific fields are provided in the fields, it will log the entire body.
export const logRequest = ({ fields = [] } = {}) => {
  return (req, res, next) => {
    const logData = {};

    if (Object.keys(req.params).length) {
      logData.params = req.params;
    }

    if (Object.keys(req.query).length) {
      logData.query = req.query;
    }

    if (req.body && Object.keys(req.body).length) {
      if (fields.length) {
        fields.forEach((field) => {
          logData[field] = req.body[field];
        });
      } else {
        logData.body = req.body;
      }
    }

    logger.info(`${req.method} ${req.originalUrl}`, logData);

    const oldEnd = res.end;

    res.end = function (...args) {
      logger.info(`${req.method} ${req.originalUrl}`, {
        statusCode: res.statusCode,
      });
      oldEnd.apply(this, args);
    };

    next();
  };
};
