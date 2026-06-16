// Validate auth payloads
export const validateRegister = (body) => {
  if (!body?.email || !body?.password) {
    throw new Error("Email and password are required");
  }
};

export const validateLogin = (body) => {
  if (!body?.phoneNumber || !body?.password) {
    throw new Error("Phone number and password are required");
  }
};
