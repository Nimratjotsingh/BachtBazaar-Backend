import { z } from "zod";

// phone
export const phoneSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Invalid phone number")
});


// password
export const passwordSchema = z.object({
  password: z.string().min(6, "Password must be atleast 6 characters")
});

// merchant password
export const merchantPasswordSchema = z.object({
  merchantId: z.string().min(1, "Merchant ID is required"),
  password: z.string().min(6, "Password must be atleast 6 characters")
});

// login with password
export const loginPasswordSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, "Invalid phone number"),
  password: z.string().min(6, "Password must be atleast 6 characters")
});

// profile update
export const updateUserProfileSchema = z.object({
  name: z.string().min(1).optional(),
  gender: z.enum(["male","female","other"]).optional(),
  address: z.string().min(3).optional()
});

// merchant profile update
export const updateMerchantProfileSchema = z.object({
 name: z.string().min(1, "Name required").optional(),

  gender: z.enum(["male","female","other"]).optional(),

  city: z.string().min(3, "City must be at least 3 chars").optional(),

  phone: z.string()
    .regex(/^[0-9]{10}$/, "Invalid phone number").optional(),

   

  email: z.string()
    .email("Invalid email")
    .optional()
  
});


//merchant shop profile update
export const updateShopProfileSchema = z.object({
  shopName: z.string()
    .min(2, { message: "Shop name must be at least 2 characters" })
    .optional(),

  category: z.enum([
    "restaurant",
    "clothing",
    "salon",
    "grocery",
    "electronics",
    "pharmacy"
  ]).optional(),

  subCategory: z.enum([
    "fast-food",
    "fine-dining",
    "cafe",
    "bakery",
    "takeaway"
  ]).optional(),

  address: z.string()
    .min(3, { message: "Address must be at least 3 characters" })
    .optional(),

  city: z.string()
    .min(3, { message: "City must be at least 3 characters" })
    .optional(),

  phone: z.string()
    .regex(/^[0-9]{10}$/, { message: "Invalid phone number" })
    .optional(),

  description: z.string()
    .max(500, { message: "Description too long" })
    .optional(),

  openingHours: z.any().optional() 
});

export const forgotPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(6, "Old password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters")
});