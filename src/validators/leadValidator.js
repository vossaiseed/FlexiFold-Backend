// Validate lead payloads
export const validateLead = (body) => {
  if (!body?.name || !body?.phone) {
    throw new Error("Lead name and phone are required");
  }
};
