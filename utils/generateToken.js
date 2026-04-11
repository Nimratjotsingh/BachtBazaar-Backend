import jwt from "jsonwebtoken";

export const generateToken = (id, { role, accountType } = {}) => {
  return jwt.sign({ id, role, accountType }, process.env.JWT_SECRET, {
    expiresIn:"7d"
  });
};