// Standard API response helpers
export const ok = (res, data = {}, message = "Success") =>
  res.json({ success: true, message, data });

export const created = (res, data = {}, message = "Created") =>
  res.status(201).json({ success: true, message, data });

export const fail = (res, status = 400, message = "Error") =>
  res.status(status).json({ success: false, message });
