import jwt from "jsonwebtoken";
import Merchant from "../models/merchantModel.js";
import User from "../models/userModel.js"
import { ACCOUNT_TYPES, ROLES } from "../constants/roles.js";

const extractBearerToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

const verifyJwt = (token) => jwt.verify(token, process.env.JWT_SECRET);

const buildAuthContext = (account, accountType) => ({
  id: account._id,
  role: account.role,
  accountType
});

export const protectUser = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = verifyJwt(token);
    if (decoded.accountType && decoded.accountType !== ACCOUNT_TYPES.USER) {
      return res.status(403).json({ message: "Forbidden: invalid account type" });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    req.user = user;
    req.auth = buildAuthContext(user, ACCOUNT_TYPES.USER);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};


export const protectMerchant = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = verifyJwt(token);
    if (decoded.accountType && decoded.accountType !== ACCOUNT_TYPES.MERCHANT) {
      return res.status(403).json({ message: "Forbidden: invalid account type" });
    }

    const merchant = await Merchant.findById(decoded.id).select("-password");
    if (!merchant) {
      return res.status(401).json({ message: "Not authorized" });
    }

    req.merchant = merchant;
    req.auth = buildAuthContext(merchant, ACCOUNT_TYPES.MERCHANT);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

export const protectAny = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = verifyJwt(token);
    let account = null;
    let accountType = decoded.accountType;

    if (decoded.accountType === ACCOUNT_TYPES.USER) {
      account = await User.findById(decoded.id).select("-password");
    } else if (decoded.accountType === ACCOUNT_TYPES.MERCHANT) {
      account = await Merchant.findById(decoded.id).select("-password");
    } else {
      account = await User.findById(decoded.id).select("-password");
      accountType = ACCOUNT_TYPES.USER;
      if (!account) {
        account = await Merchant.findById(decoded.id).select("-password");
        accountType = ACCOUNT_TYPES.MERCHANT;
      }
    }

    if (!account) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (accountType === ACCOUNT_TYPES.USER) {
      req.user = account;
    }
    if (accountType === ACCOUNT_TYPES.MERCHANT) {
      req.merchant = account;
    }

    req.auth = buildAuthContext(account, accountType);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

export const requireRoles = (...allowedRoles) => (req, res, next) => {
  const role = req.auth?.role;
  if (!role) {
    return res.status(403).json({ message: "Forbidden: role missing" });
  }
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  return next();
};

export const requireSuperAdmin = requireRoles(ROLES.SUPER_ADMIN);