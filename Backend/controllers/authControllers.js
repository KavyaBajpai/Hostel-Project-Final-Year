import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
//import  db from "../config/db.js";
import { users } from "../schema/schema.js";
import { eq } from "drizzle-orm";
import { connectToDB } from "../config/db.js";

// NOTE: include hostelName in token payload so downstream middlewares can scope by hostel
const generateToken = (userId, role,name, hostelName) => {
    return jwt.sign({id: userId, role, name, hostelName}, process.env.JWT_SECRET, {
        expiresIn: "7d"
    });
};

export const registerUser = async( req, res) => {
    const {name, email, password, role, hostelName } = req.body;

    if(!name || !email || !password || !role || !hostelName)
        return res.status(400).json({ message: "All fields are required."});
    
    const hashedPass = await bcrypt.hash(password, 10);
    try{
        const db = await connectToDB()
        const userExists = await db.select().from(users).where( eq(users.email, email));

    if( userExists.length > 0)
        return res.status(400).json({message: "You have already regsitered."});

    

    const newUser = await db
     .insert(users)
     .values({name, email, password: hashedPass, role, hostelName})
     .returning()

    // FIX: previously token omitted hostelName; include it to support role/hostel middlewares
    const token = generateToken(newUser[0].id, newUser[0].role, newUser[0].hostelName);

    res.status(201).json({
        message: "You have been registered successfully.",
        user: {
            id: newUser[0].id,
            name, email, role, hostelName, token
        }
    });
    }
    catch(err)
    {
        console.log("error in registering user.");
        console.log("error: ", err)
        res.status(500).json({ error: "Error in registering.", message: err.message})
    }
    
}

export const loginUser= async( req, res) => {
    const {email, password} = req.body;
    if(!email || !password)
        return res.status(400).json({message: "All fields are neccessary."});
    
    try{ 
        const db = await connectToDB()
         const user = await db
           .select()
           .from(users)
           // FIX: eq() arguments reversed earlier; correct to eq(users.email, email)
           .where(eq(users.email, email));

         if(user.length == 0)  
            return res.status(400).json({message: "Invallid email."});

         const match = await bcrypt.compare(password, user[0].password);

         if(!match)
            return res.status(400).json({ message: "Invalid password."});
         console.log(user)
         const token = generateToken(user[0].id, user[0].role, user[0].name, user[0].hostelName);

         res.status(200).json({
            message: "You have been logged in successfully.",
            user: {
                id: user[0].id,
                name: user[0].name,
                email: user[0].email,
                role: user[0].role,
                hostelName: user[0].hostelName,
                token,
            }
         });
    }
    catch(err)
    {
        console.log("error logging in");
        return res.status(500).json({error: "Error in logging in.", message: err})
    }

}