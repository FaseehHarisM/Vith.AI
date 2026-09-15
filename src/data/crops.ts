export const CROP_OPTIONS = [
  // Cereals
  { name: "Paddy (Rice)", category: "Cereals" },
  { name: "Maize", category: "Cereals" },
  { name: "Ragi (Finger Millet)", category: "Cereals" },
  
  // Plantation & Cash Crops
  { name: "Coconut", category: "Plantation" },
  { name: "Rubber", category: "Plantation" },
  { name: "Arecanut", category: "Plantation" },
  { name: "Cashew", category: "Plantation" },
  { name: "Cocoa", category: "Plantation" },
  { name: "Coffee", category: "Plantation" },
  { name: "Tea", category: "Plantation" },
  
  // Spices
  { name: "Black Pepper", category: "Spices" },
  { name: "Cardamom", category: "Spices" },
  { name: "Ginger", category: "Spices" },
  { name: "Turmeric", category: "Spices" },
  { name: "Nutmeg", category: "Spices" },
  { name: "Clove", category: "Spices" },
  { name: "Cinnamon", category: "Spices" },
  { name: "Vanilla", category: "Spices" },
  
  // Tubers
  { name: "Tapioca (Cassava)", category: "Tubers" },
  { name: "Elephant Foot Yam", category: "Tubers" },
  { name: "Sweet Potato", category: "Tubers" },
  { name: "Taro (Colocasia)", category: "Tubers" },
  { name: "Greater Yam", category: "Tubers" },
  
  // Fruits
  { name: "Banana (Plantain)", category: "Fruits" },
  { name: "Pineapple", category: "Fruits" },
  { name: "Jackfruit", category: "Fruits" },
  { name: "Mango", category: "Fruits" },
  { name: "Papaya", category: "Fruits" },
  { name: "Guava", category: "Fruits" },
  { name: "Passion Fruit", category: "Fruits" },
  { name: "Mangosteen", category: "Fruits" },
  { name: "Rambutan", category: "Fruits" },
  
  // Vegetables (Kerala Specials)
  { name: "Bitter Gourd", category: "Vegetables" },
  { name: "Snake Gourd", category: "Vegetables" },
  { name: "Ash Gourd", category: "Vegetables" },
  { name: "Pumpkin", category: "Vegetables" },
  { name: "Cucumber", category: "Vegetables" },
  { name: "Okra (Ladyfinger)", category: "Vegetables" },
  { name: "Eggplant (Brinjal)", category: "Vegetables" },
  { name: "Cowpea (Yardlong Bean)", category: "Vegetables" },
  { name: "Tomato", category: "Vegetables" },
  { name: "Green Chili", category: "Vegetables" },
  { name: "Amaranth (Cheera)", category: "Vegetables" },
  { name: "Drumstick (Moringa)", category: "Vegetables" },
  
  // Pulses
  { name: "Black Gram", category: "Pulses" },
  { name: "Green Gram", category: "Pulses" },
  { name: "Horse Gram", category: "Pulses" },
  
  // Oilseeds
  { name: "Sesame", category: "Oilseeds" },
  { name: "Groundnut", category: "Oilseeds" },
];

export const CROP_CATEGORIES = Array.from(new Set(CROP_OPTIONS.map(c => c.category)));
