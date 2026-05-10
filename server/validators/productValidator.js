import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters").max(100),
  description: z.string().min(10, "Description should be more descriptive"),
  
  // IDs are validated as strings (MongoDB ObjectIds)
  category_id: z.string().min(1, "Category is required"),
  subcategory_id: z.string().min(1, "Subcategory is required"),
  service_id: z.string().min(1, "Service type is required"),

  price: z.number().positive("Price must be greater than zero"),
  discounted_price: z.number().positive().nullable().optional(),

  stock: z.number().int().nonnegative("Stock cannot be negative"),
  sku: z.string().min(3, "SKU is required for inventory"),

  // Image validation
  thumbnail: z.string().url("Thumbnail must be a valid URL"),
  images: z.array(z.string().url()).max(10, "Max 10 images allowed"),

  tags: z.array(z.string()).optional(),
  
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
}).refine((data) => {
  if (data.discounted_price && data.discounted_price >= data.price) {
    return false;
  }
  return true;
}, {
  message: "Discounted price must be lower than the original price",
  path: ["discounted_price"],
});