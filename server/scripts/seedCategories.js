import dotenv from "dotenv";
import mongoose from "mongoose";
import Category from "../models/categoryModel.js";
import SubCategory from "../models/subCategoryModel.js";

dotenv.config();

const DATA = [
  {
    label: "Food & Drinks",
    description: "Dining, beverages, and desserts",
    subcategories: [
      "Restaurants",
      "Fast Food",
      "Street Food",
      "Cafe",
      "Tea & Coffee",
      "Juice & Shakes",
      "Bakery",
      "Sweets & Mithai",
      "Ice Cream & Desserts",
      "Cloud Kitchen"
    ]
  },
  {
    label: "Grocery",
    description: "Daily groceries and household food staples",
    subcategories: [
      "Kirana Store",
      "Supermarket",
      "Fruits & Vegetables",
      "Dairy Products",
      "Meat & Fish",
      "Frozen Foods",
      "Organic Store",
      "Grains & Pulses",
      "Spices & Masala",
      "Snacks & Packaged Food",
      "Beverages",
      "Bakery Items"
    ]
  },
  {
    label: "Daily Needs",
    description: "Everyday essentials and utility products",
    subcategories: [
      "General Store",
      "Personal Care",
      "Household Essentials",
      "Cleaning Supplies",
      "Baby Care",
      "Stationery",
      "Pooja Items",
      "Pet Supplies"
    ]
  },
  {
    label: "Fashion & Clothing",
    description: "Apparel and accessories",
    subcategories: [
      "Men Clothing",
      "Women Clothing",
      "Kids Wear",
      "Jewellery",
      "Ethnic Wear",
      "Western Wear",
      "Footwear",
      "Accessories",
      "Tailor & Boutique"
    ]
  },
  {
    label: "Salon & Beauty",
    description: "Beauty and personal grooming services",
    subcategories: [
      "Men Salon",
      "Beauty Parlour",
      "Unisex Salon",
      "Spa",
      "Nail Art",
      "Tattoo & Piercing Studio"
    ]
  },
  {
    label: "Electronics & Mobile",
    description: "Electronics retail and repair services",
    subcategories: [
      "Mobile Store",
      "Mobile Accessories",
      "Electronics Shop",
      "Laptop & Computer",
      "Repair Services",
      "TV & Appliances",
      "CCTV & Security",
      "Home Appliances",
      "Camera & Photography",
      "Gaming & Console",
      "Smart Gadgets & Wearables"
    ]
  },
  {
    label: "Health & Medical",
    description: "Healthcare providers and medicine",
    subcategories: [
      "Medical Store",
      "Hospital",
      "Dental",
      "Eye",
      "Diagnostics Lab",
      "Physiotherapy",
      "Ayurveda",
      "Unani Clinic",
      "ENT",
      "Homeopathy",
      "Nutrition Center",
      "Mental Health",
      "Skin Clinic",
      "Orthopedic",
      "Pediatric",
      "Gynecology",
      "Cardiology",
      "General Physician"
    ]
  },
  {
    label: "Fitness & Wellness",
    description: "Fitness and wellness activities",
    subcategories: [
      "Gym",
      "Yoga Center",
      "Zumba",
      "Personal Trainer",
      "Nutrition Center",
      "CrossFit",
      "Martial Arts",
      "Sports Training",
      "Meditation"
    ]
  },
  {
    label: "Education & Learning",
    description: "Education, coaching, and skill-building",
    subcategories: [
      "Coaching Institute",
      "School",
      "College",
      "Computer Classes",
      "Language Classes",
      "Tuition",
      "Library",
      "Online Coaching",
      "Skill Development",
      "IELTS Coaching"
    ]
  },
  {
    label: "Home Services",
    description: "On-demand home service providers",
    subcategories: [
      "Electrician",
      "Plumber",
      "Carpenter",
      "AC Repair",
      "Cleaning",
      "Painter",
      "Appliance Repair",
      "Pest Control",
      "Packers & Movers",
      "Interior Design",
      "Water Tank Cleaning",
      "RO Service"
    ]
  },
  {
    label: "Home & Living",
    description: "Home products and living essentials",
    subcategories: [
      "Furniture",
      "Home Decor",
      "Kitchen",
      "Lighting",
      "Mattress",
      "Curtains",
      "Carpets",
      "Wall Decor",
      "Storage",
      "Bathroom",
      "Garden",
      "Hardware",
      "Tiles",
      "Modular Kitchen"
    ]
  },
  {
    label: "Automobile",
    description: "Automotive services and supplies",
    subcategories: [
      "Petrol Pump",
      "EV Charging",
      "Bike Service",
      "Car Service",
      "Accessories",
      "Spare Parts",
      "Tyre Shop",
      "Car Wash",
      "Battery",
      "Driving School",
      "Towing"
    ]
  },
  {
    label: "Entertainment",
    description: "Leisure, events, and fun activities",
    subcategories: [
      "Gaming Zone",
      "Amusement Park",
      "Event Organizer",
      "Party Hall",
      "Club",
      "Arcade",
      "Cinema",
      "Water Park",
      "Live Music",
      "DJ",
      "Photography",
      "Kids Zone",
      "Bowling",
      "VR Games",
      "Escape Room"
    ]
  },
  {
    label: "Professional Services",
    description: "Business and professional advisory services",
    subcategories: [
      "CA",
      "Lawyer",
      "Consultant",
      "Insurance",
      "Tax",
      "GST",
      "Business Consultant",
      "Startup Consultant",
      "Real Estate",
      "Financial Advisor",
      "Loan Services",
      "Digital Marketing",
      "Web Development",
      "Graphic Design",
      "Freelancers",
      "HR"
    ]
  },
  {
    label: "Travel & Bookings",
    description: "Travel and accommodation services",
    subcategories: [
      "Travel Agency",
      "Tour Packages",
      "Hotel",
      "Resort",
      "Homestay",
      "Car Rental",
      "Bike Rental",
      "Pilgrimage",
      "Adventure",
      "Visa",
      "Guide"
    ]
  },
  {
    label: "Delivery & Logistics",
    description: "Courier and delivery operations",
    subcategories: [
      "Courier",
      "Bike Delivery",
      "Transport",
      "Food Delivery",
      "Medical Delivery"
    ]
  },
  {
    label: "Pet Services",
    description: "Pet products and care services",
    subcategories: [
      "Pet Shop",
      "Grooming",
      "Vet",
      "Pharmacy",
      "Boarding",
      "Training",
      "Adoption",
      "Spa",
      "Walking",
      "Sitting"
    ]
  },
  {
    label: "Gifts & Specialty",
    description: "Specialty gifting products and services",
    subcategories: ["Gift Shop", "Flower Shop", "Cake Shop"]
  },
  {
    label: "Others",
    description: "Custom business types provided by merchants",
    subcategories: ["Custom Business Type"]
  }
];

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in environment");
  }

  await mongoose.connect(process.env.MONGO_URI);

  let categoryUpserts = 0;
  let subcategoryUpserts = 0;

  for (const entry of DATA) {
    const categoryValue = slugify(entry.label);

    const category = await Category.findOneAndUpdate(
      { value: categoryValue },
      {
        value: categoryValue,
        label: entry.label,
        description: entry.description,
        isActive: true
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    categoryUpserts += 1;

    for (const subLabel of entry.subcategories) {
      const subValue = slugify(subLabel);

      await SubCategory.findOneAndUpdate(
        { categoryId: category._id, value: subValue },
        {
          categoryId: category._id,
          value: subValue,
          label: subLabel,
          description: `${subLabel} under ${entry.label}`,
          isActive: true
        },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
      );

      subcategoryUpserts += 1;
    }
  }

  console.log(`Seed complete: ${categoryUpserts} categories, ${subcategoryUpserts} subcategories upserted.`);
};

seed()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seeding failed:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
