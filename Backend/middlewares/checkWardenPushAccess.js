/** Allows warden and admin to register for device push notifications. */
export const checkWardenPushAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized." });
  }
  const { role } = req.user;
  if (role !== "warden" && role !== "admin") {
    return res.status(403).json({ message: "Only wardens can enable push notifications." });
  }
  next();
};
