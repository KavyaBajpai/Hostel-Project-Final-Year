export const checkHostelAccess = (req, res, next) => {
  console.log("user in checkrole middlw:", req.user)
   if (!req.user) {
    return res.status(401).json({ message: "Unauthorized. No user data." });
  }
  const { id, role, hostelName } = req.user;
  const requestedHostel = req.query.hostel || req.query.hostelName;

  if (role === "warden") {
    if (!hostelName) {
      return res.status(403).json({
        message: "Your warden account has no hostel assigned. Contact an administrator.",
      });
    }
    // warden can only see their own hostel
    if (requestedHostel && requestedHostel !== hostelName) {
      return res.status(403).json({ message: "Access denied for this hostel." });
    }
    // force hostel to warden's hostel
    req.hostelScope = hostelName;
  } else if (role === "admin") {
    // admin can see all hostels, or filter if they specify
    req.hostelScope = requestedHostel || null;
  } else {
    // students etc. should not hit these routes
    return res.status(403).json({ message: "Access denied." });
  }

  next();
};

export const checkMessAccess = (req, res, next) => {
  console.log("user in checkMessAccess middleware:", req.user);

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized. No user data." });
  }

  const { role, hostelName } = req.user;
  const requestedHostel = req.query.hostel || req.query.hostelName;

  if (role === "mess-incharge") {
    // mess-incharge can only manage their own hostel
    if (requestedHostel && requestedHostel !== hostelName) {
      return res.status(403).json({ message: "Access denied for this hostel." });
    }
    // force hostel scope to mess-incharge's hostel
    req.hostelScope = hostelName;
  } else if (role === "admin") {
    // admin can manage all hostels, or filter if specified
    req.hostelScope = requestedHostel || null;
  } else {
    // no access for wardens, students, etc.
    return res.status(403).json({ message: "Access denied." });
  }

  next();
};


