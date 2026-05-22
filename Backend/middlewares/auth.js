import jwt from 'jsonwebtoken';
import { config } from 'dotenv';
config();

export const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ message: "Unauthorized"});

    const token = authHeader.split(" ")[1];

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("decoded: ", decoded)
       req.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      hostelName: decoded.hostelName,
    };
    console.log("user:" , req.user)
        next();
    }
    catch(error)
    {
        return res.status(401).json({ message: "Invalid token."});
    }
};