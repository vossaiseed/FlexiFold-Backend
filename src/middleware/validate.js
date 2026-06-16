// Runs a validator function and forwards errors
export const validate = (schema) => (req, res, next) => {
  try {
    if (schema) schema(req.body);
    next();
  } catch (err) {
    err.status = 400;
    next(err);
  }
};
