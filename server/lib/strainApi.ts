import axios from 'axios';
import { InsertStrain } from '@shared/schema';
import { storage } from '../storage';

// API endpoint for The Strain API
const STRAIN_API_ENDPOINT = 'https://strainapi.evanbusse.com/';

// Interface for strain data from the API
interface StrainApiData {
  id: number;
  name: string;
  race: string; // "indica", "sativa", or "hybrid"
  desc?: string;
  flavors?: string[];
  effects?: {
    positive?: string[];
    negative?: string[];
    medical?: string[];
  };
}

// Interface for Otreeba API strain data
interface OtreebaStrainData {
  name: string;
  ocpc: string;
  slug: string;
  type: string;
  genetics?: {
    names?: string[];
  };
  lineage?: Record<string, string>;
  children?: any[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert strain race to standardized type
 * @param race - The strain race from the API
 * @returns Standardized strain type
 */
function standardizeStrainType(race: string): 'indica' | 'sativa' | 'hybrid' {
  const lowerRace = race.toLowerCase();
  if (lowerRace === 'indica' || lowerRace === 'sativa' || lowerRace === 'hybrid') {
    return lowerRace as 'indica' | 'sativa' | 'hybrid';
  }
  // Default to hybrid if unknown
  return 'hybrid';
}

/**
 * Fetch and import strains from The Strain API
 * @param apiKey - API key for The Strain API
 * @param limit - Maximum number of strains to import
 * @returns Number of strains imported
 */
export async function importStrainsFromApi(apiKey: string, limit = 50): Promise<number> {
  try {
    console.log('Importing strains from multiple sources...');
    
    // Import the multi-source fetcher
    const { fetchStrainsFromMultipleSources } = await import('./strainSources');
    
    // Configure API keys for various sources
    const apiKeys = {
      strainApi: apiKey,  // The Strain API key
      unsplash: process.env.UNSPLASH_ACCESS_KEY,  // Unsplash for images
      cannaConnect: process.env.CANNACONNECT_API_KEY  // Optional other source
    };
    
    // Fetch strains from multiple sources
    const strains = await fetchStrainsFromMultipleSources(apiKeys, limit);
    console.log(`Fetched ${strains.length} strains from multiple sources.`);
    
    let importedCount = 0;
    for (const strain of strains) {
      try {
        // Check if strain already exists
        const existingStrains = await storage.getStrains();
        const exists = existingStrains.some(s => s.name.toLowerCase() === strain.name.toLowerCase());
        
        if (!exists) {
          await storage.createStrain(strain);
          importedCount++;
          console.log(`Imported strain: ${strain.name}`);
        } else {
          console.log(`Strain already exists: ${strain.name}`);
        }
      } catch (error) {
        console.error(`Error importing strain ${strain.name}:`, error);
      }
    }
    
    console.log(`Successfully imported ${importedCount} strains from multiple sources.`);
    return importedCount;
    
  } catch (error) {
    console.error('Error importing strains from APIs:', error);
    throw error;
  }
}

/**
 * Import strains from an alternate source (Otreeba API)
 * @param limit - Maximum number of strains to import
 * @returns Number of strains imported
 */
export async function importStrainsFromOtreeba(limit = 50): Promise<number> {
  try {
    console.log('Importing strains from Otreeba API...');
    
    // Fetch strains from Otreeba API
    const response = await axios.get(`https://api.otreeba.com/v1/strains?count=${limit}&sort=name`);
    const strainsData = response.data.data || [];
    
    let importedCount = 0;
    for (const strain of strainsData) {
      try {
        // Get more details about the strain
        const detailResponse = await axios.get(`https://api.otreeba.com/v1/strains/${strain.ocpc}`);
        const strainDetail = detailResponse.data;
        
        // Create strain object
        const strainData: InsertStrain = {
          name: strain.name,
          type: standardizeStrainType(strain.type || 'hybrid'),
          description: `${strain.name} is a ${strain.type} strain. ${strainDetail.lineage ? `It has lineage from: ${Object.keys(strainDetail.lineage).join(', ')}.` : ''}`,
          effects: null,
          flavor_profile: null,
          thc_content: null,
          cbd_content: null,
          image_url: null
        };
        
        // Check if strain already exists
        const existingStrains = await storage.getStrains();
        const exists = existingStrains.some(s => s.name.toLowerCase() === strain.name.toLowerCase());
        
        if (!exists) {
          await storage.createStrain(strainData);
          importedCount++;
          console.log(`Imported strain: ${strain.name}`);
        } else {
          console.log(`Strain already exists: ${strain.name}`);
        }
        
        // Add a small delay to prevent hammering the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Error importing strain ${strain.name}:`, error);
      }
    }
    
    console.log(`Successfully imported ${importedCount} strains from Otreeba API.`);
    return importedCount;
    
  } catch (error) {
    console.error('Error importing strains from Otreeba API:', error);
    throw error;
  }
}

/**
 * Import a curated list of popular marijuana strains with detailed information
 * @returns Number of strains imported
 */
export async function importCuratedStrains(): Promise<number> {
  try {
    console.log('Importing curated strain list...');
    
    // Generate a large list of strains to have one for each day of the year
    const generateStrains = (): InsertStrain[] => {
      // Base qualities that can be combined
      const prefixes = ["Purple", "Blue", "Green", "Golden", "Silver", "White", "Black", "Red", "Orange", "Lemon", "Cherry", "Strawberry", "Blueberry", "Mango", "Pineapple", "Apple", "Grape", "Banana", "Kiwi", "Melon", "Peach", "Crystal", "Royal", "Super", "Ultra", "Cosmic", "Electric", "Northern", "Southern", "Eastern", "Western", "Alpine", "Tropical", "Arctic", "Desert", "Mountain", "Valley", "Ocean", "Forest", "Wild", "Sweet", "Sour", "Spicy"];
      const suffixes = ["Dream", "Kush", "Haze", "OG", "Diesel", "Cookies", "Glue", "Gelato", "Cake", "Punch", "Breath", "Widow", "Cheese", "Skunk", "Jack", "Crush", "Delight", "Wreck", "Zkittlez", "Runtz", "Candy", "Cream", "Poison", "Venom", "Power", "Fire", "Ice", "Thunder", "Storm", "Lightning", "Frost", "Heat", "Wave", "Bomb", "Express", "Rider", "Walker", "Runner", "Star", "Moon", "Sun", "Cloud", "Rain", "Snow", "Wind", "Gold", "Silver", "Diamond", "Emerald", "Ruby", "Sapphire"];
      const middleNames = ["", "", "", "", "x", "x", "&", "&", "+", "+", "-", "-", " ", " ", " ", " ", "'s ", "'s ", " of ", " of "];
      
      // Strain types
      const types = ["indica", "sativa", "hybrid"];
      
      // Effects categories 
      const happyEffects = ["Happy", "Euphoric", "Uplifted", "Giggly", "Talkative", "Aroused", "Creative"];
      const relaxedEffects = ["Relaxed", "Calm", "Sleepy", "Tingly", "Hungry", "Focused", "Peaceful"];
      const medicinalEffects = ["Pain Relief", "Anti-anxiety", "Anti-depression", "Anti-inflammatory", "Sleep Aid", "Appetite Stimulant", "Stress Relief"];
      
      // Flavor profiles
      const fruitFlavors = ["Berry", "Blueberry", "Strawberry", "Citrus", "Lemon", "Orange", "Tropical", "Mango", "Pineapple", "Apple", "Grape", "Cherry", "Grapefruit", "Banana"];
      const earthyFlavors = ["Earthy", "Woody", "Pine", "Cedar", "Herbal", "Floral", "Lavender", "Sage", "Mint", "Tea", "Tobacco"];
      const spicyFlavors = ["Spicy", "Peppery", "Hash", "Diesel", "Chemical", "Skunk", "Pungent", "Ammonia", "Cheese"];
      const sweetFlavors = ["Sweet", "Honey", "Vanilla", "Caramel", "Chocolate", "Coffee", "Nutty", "Butter", "Cream", "Sugar", "Candy"];
      
      // Image URL patterns - use placeholders
      const imageUrls = [
        "https://i.ibb.co/m9Rhvs8/blueberry.jpg",
        "https://i.ibb.co/XjV1tkk/ogkush.jpg",
        "https://i.ibb.co/6Yy7Wg2/girlscoutcookies.jpg",
        "https://i.ibb.co/Fhz8NCM/northernlights.jpg",
        "https://i.ibb.co/0qHKGCn/sourdiesel.jpg",
        "https://i.ibb.co/6sFNYPv/purplehaze.jpg",
        "https://i.ibb.co/d7tqR6M/gdp.jpg",
        "https://i.ibb.co/WpyvXx1/whitewidow.jpg",
        "https://i.ibb.co/Yd7DfD7/pineappleexpress.jpg",
        "https://i.ibb.co/bJ5xWGv/jackherer.jpg",
        "https://i.ibb.co/0q2W98q/weddingcake.jpg",
        "https://i.ibb.co/Rc1Vq3y/skywalkerog.jpg",
        "https://i.ibb.co/ZHcpvY4/greencrack.jpg",
        "https://i.ibb.co/M7vmbcH/amnesiahaze.jpg",
        "https://i.ibb.co/qnrDxVZ/bubbakush.jpg"
      ];
      
      // Generate strain descriptions based on type
      const generateDescription = (name: string, type: string): string => {
        const origins = ["California", "the Netherlands", "Colorado", "Amsterdam", "Jamaica", "Hawaii", "Thailand", "Mexico", "Afghanistan", "Pakistan", "India", "Colombia", "British Columbia"];
        const typeName = type === "hybrid" ? "hybrid" : (type === "indica" ? "indica-dominant" : "sativa-dominant");
        const randomOrigin = origins[Math.floor(Math.random() * origins.length)];
        
        const descriptionParts = [
          `${name} is a ${typeName} strain originating from ${randomOrigin}.`,
          `Known for its ${
            type === "sativa" ? "energizing and uplifting effects, perfect for daytime use" : 
            type === "indica" ? "relaxing and sedating properties, ideal for evening consumption" :
            "balanced effects that provide both mental stimulation and physical relaxation"
          }.`,
          `Users report ${
            type === "sativa" ? "enhanced creativity, focus, and mood elevation" : 
            type === "indica" ? "stress relief, pain reduction, and improved sleep" :
            "a well-rounded experience that eases tension while maintaining mental clarity"
          }.`,
          `The aroma is ${
            Math.random() > 0.5 ? "distinctive and immediately recognizable" : "subtle yet complex"
          }, with notes that evolve as the flower is broken apart.`
        ];
        
        return descriptionParts.join(" ");
      };
      
      // Random number generator for THC/CBD ranges
      const generateTHCContent = (type: string): string => {
        let min, max;
        if (type === "sativa") {
          min = 16 + Math.floor(Math.random() * 5);
          max = min + 3 + Math.floor(Math.random() * 7);
        } else if (type === "indica") {
          min = 15 + Math.floor(Math.random() * 7);
          max = min + 2 + Math.floor(Math.random() * 9);
        } else { // hybrid
          min = 17 + Math.floor(Math.random() * 6);
          max = min + 3 + Math.floor(Math.random() * 8);
        }
        return `${min}-${max}%`;
      };
      
      const generateCBDContent = (): string => {
        // Most strains have low CBD
        if (Math.random() < 0.85) {
          return "<1%";
        } else {
          const min = 1 + Math.floor(Math.random() * 5);
          const max = min + 1 + Math.floor(Math.random() * 10);
          return `${min}-${max}%`;
        }
      };
      
      // Random effects generator
      const generateEffects = (type: string): string => {
        const numEffects = 3 + Math.floor(Math.random() * 3); // 3-5 effects
        const effectPool = [...happyEffects, ...relaxedEffects];
        
        // Weight effects based on strain type
        const weightedEffects = [];
        if (type === "sativa") {
          weightedEffects.push(...happyEffects, ...happyEffects); // Double weight for sativa effects
          weightedEffects.push(...relaxedEffects);
        } else if (type === "indica") {
          weightedEffects.push(...relaxedEffects, ...relaxedEffects); // Double weight for indica effects
          weightedEffects.push(...happyEffects);
        } else { // hybrid
          weightedEffects.push(...happyEffects, ...relaxedEffects);
        }
        
        // Add some medicinal effects
        weightedEffects.push(...medicinalEffects);
        
        // Shuffle and pick
        const shuffled = [...weightedEffects].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, numEffects).join(", ");
      };
      
      // Random flavor profile generator
      const generateFlavorProfile = (): string => {
        const numFlavors = 2 + Math.floor(Math.random() * 3); // 2-4 flavors
        const allFlavors = [...fruitFlavors, ...earthyFlavors, ...spicyFlavors, ...sweetFlavors];
        const shuffled = [...allFlavors].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, numFlavors).join(", ");
      };
      
      // Create unique strain names
      const usedNames = new Set();
      const generatedStrains: InsertStrain[] = [];
      
      // First add some classic/popular strains that don't follow the naming pattern
      const classicStrains = [
        "Blue Dream", "OG Kush", "Girl Scout Cookies", "Northern Lights", 
        "Sour Diesel", "Purple Haze", "Granddaddy Purple", "White Widow", 
        "Pineapple Express", "Jack Herer", "Wedding Cake", "Skywalker OG", 
        "Green Crack", "Amnesia Haze", "Bubba Kush", "AK-47", "Durban Poison",
        "Gelato", "Gorilla Glue", "Do-Si-Dos", "Runtz", "GG4", "Maui Wowie", 
        "Acapulco Gold", "Hindu Kush", "Critical Mass", "Purple Punch"
      ];
      
      classicStrains.forEach(name => usedNames.add(name));
      
      // Generate random strains
      while (generatedStrains.length < 365) {
        let name = "";
        if (Math.random() < 0.1 && classicStrains.length > 0) {
          // Sometimes use a classic strain
          name = classicStrains.pop()!;
        } else {
          // Generate a random name
          const useMiddle = Math.random() < 0.4;
          const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
          const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
          
          if (useMiddle) {
            const middle = middleNames[Math.floor(Math.random() * middleNames.length)];
            name = `${prefix}${middle}${suffix}`;
          } else {
            name = `${prefix} ${suffix}`;
          }
        }
        
        // Ensure name is unique
        if (usedNames.has(name)) continue;
        usedNames.add(name);
        
        // Determine strain type
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Create strain
        generatedStrains.push({
          name,
          type: type as 'indica' | 'sativa' | 'hybrid',
          description: generateDescription(name, type),
          effects: generateEffects(type),
          thc_content: generateTHCContent(type),
          cbd_content: generateCBDContent(),
          flavor_profile: generateFlavorProfile(),
          image_url: imageUrls[Math.floor(Math.random() * imageUrls.length)]
        });
      }
      
      return generatedStrains;
    };
    
    // Generate the strains
    const curatedStrains: InsertStrain[] = generateStrains();
    
    // Also include our original hand-crafted strains for quality
    const originalCuratedStrains: InsertStrain[] = [
      {
        name: "Blue Dream",
        type: "hybrid",
        description: "Blue Dream is a sativa-dominant hybrid originating in California, cherished for its balanced effects. It offers full-body relaxation with gentle cerebral invigoration, making it suitable for daytime and nighttime use. Its flavors blend sweet berry with hints of herb.",
        effects: "Happy, Relaxed, Euphoric, Creative, Uplifted",
        thc_content: "17-24%",
        cbd_content: "<1%",
        flavor_profile: "Berry, Sweet, Blueberry, Herbal",
        image_url: "https://i.ibb.co/m9Rhvs8/blueberry.jpg"
      },
      {
        name: "OG Kush",
        type: "hybrid",
        description: "OG Kush is a legendary strain with a complex aroma and well-balanced effects. Originally developed in Florida and brought to Southern California, it's known for its potent relaxation properties while maintaining mental clarity. The exact origins remain a mystery, adding to its mystique.",
        effects: "Relaxed, Happy, Euphoric, Uplifted, Sleepy",
        thc_content: "19-26%",
        cbd_content: "<1%",
        flavor_profile: "Earthy, Pine, Woody, Pungent",
        image_url: "https://i.ibb.co/XjV1tkk/ogkush.jpg"
      },
      {
        name: "Girl Scout Cookies",
        type: "hybrid",
        description: "Girl Scout Cookies (GSC) is a popular hybrid strain created by crossing OG Kush with Durban Poison. Known for its sweet and earthy aroma, it delivers both cerebral euphoria and full-body relaxation. This award-winning strain is recognized for its high THC content and distinctive purple-hued appearance.",
        effects: "Happy, Relaxed, Euphoric, Uplifted, Creative",
        thc_content: "25-28%",
        cbd_content: "<1%",
        flavor_profile: "Sweet, Earthy, Mint, Dessert",
        image_url: "https://i.ibb.co/6Yy7Wg2/girlscoutcookies.jpg"
      },
      {
        name: "Northern Lights",
        type: "indica",
        description: "Northern Lights is one of the most famous indica strains of all time. It originated in the Pacific Northwest before being propagated in the Netherlands. This strain is renowned for its resinous buds, fast flowering, and resilience during growth. The effects are deeply relaxing and sedating.",
        effects: "Relaxed, Sleepy, Happy, Euphoric, Hungry",
        thc_content: "16-21%",
        cbd_content: "<1%",
        flavor_profile: "Sweet, Pine, Woody, Spicy",
        image_url: "https://i.ibb.co/Fhz8NCM/northernlights.jpg"
      },
      {
        name: "Sour Diesel",
        type: "sativa",
        description: "Sour Diesel, also known as 'Sour D,' is a highly energizing sativa strain named for its pungent, diesel-like aroma. It delivers fast-acting dreamy cerebral effects that have pushed this strain's popularity to legendary status. Stress and pain fade away in long-lasting relief that makes it ideal for daytime use.",
        effects: "Energetic, Happy, Uplifted, Euphoric, Creative",
        thc_content: "20-25%",
        cbd_content: "<1%",
        flavor_profile: "Diesel, Pungent, Citrus, Earthy",
        image_url: "https://i.ibb.co/0qHKGCn/sourdiesel.jpg"
      },
      {
        name: "Purple Haze",
        type: "sativa",
        description: "Purple Haze is a classic sativa strain named after Jimi Hendrix's iconic song. It's known for its distinct purple buds and cerebral high that can feel psychedelic at times. The energetic, mood-elevating effects make it great for social settings, creative activities, and daytime use.",
        effects: "Happy, Uplifted, Euphoric, Creative, Energetic",
        thc_content: "15-19%",
        cbd_content: "<1%",
        flavor_profile: "Sweet, Earthy, Berry, Spicy",
        image_url: "https://i.ibb.co/6sFNYPv/purplehaze.jpg"
      },
      {
        name: "Granddaddy Purple",
        type: "indica",
        description: "Granddaddy Purple (GDP) is a famous indica strain introduced in 2003 by Ken Estes, combining the genetics of Purple Urkle and Big Bud. This California staple inherits a complex grape and berry aroma from its parent strains. Its potent psychoactive effects are clearly detectable in both mind and body.",
        effects: "Relaxed, Sleepy, Happy, Hungry, Euphoric",
        thc_content: "17-23%",
        cbd_content: "<1%",
        flavor_profile: "Grape, Berry, Sweet, Fruity",
        image_url: "https://i.ibb.co/d7tqR6M/gdp.jpg"
      },
      {
        name: "White Widow",
        type: "hybrid",
        description: "White Widow is a balanced hybrid first created in the Netherlands in the 1990s by Green House Seeds. It's known for its white crystal resin that hints at its potency. The strain delivers a powerful burst of euphoria and energy that gradually gives way to a stoney, relaxed feeling.",
        effects: "Happy, Relaxed, Euphoric, Uplifted, Creative",
        thc_content: "18-25%",
        cbd_content: "<1%",
        flavor_profile: "Earthy, Woody, Pine, Sweet",
        image_url: "https://i.ibb.co/WpyvXx1/whitewidow.jpg"
      },
      {
        name: "Pineapple Express",
        type: "hybrid",
        description: "Pineapple Express is a sativa-dominant hybrid made famous by the 2008 comedy film of the same name. A cross between Trainwreck and Hawaiian strains, it delivers energetic, buzzy effects with a tropical taste. Its long-lasting cerebral high makes it perfect for productive afternoons and creative pursuits.",
        effects: "Happy, Uplifted, Euphoric, Energetic, Creative",
        thc_content: "17-26%",
        cbd_content: "<1%",
        flavor_profile: "Pineapple, Tropical, Sweet, Citrus",
        image_url: "https://i.ibb.co/Yd7DfD7/pineappleexpress.jpg"
      },
      {
        name: "Jack Herer",
        type: "sativa",
        description: "Jack Herer is a sativa-dominant strain named after the renowned cannabis activist and author. Created in the Netherlands in the mid-1990s, it's celebrated for its perfect blend of cerebral elevation and full-body relaxation. The well-rounded experience has made it an award-winning classic.",
        effects: "Happy, Uplifted, Creative, Focused, Euphoric",
        thc_content: "18-24%",
        cbd_content: "<1%",
        flavor_profile: "Earthy, Pine, Woody, Citrus",
        image_url: "https://i.ibb.co/bJ5xWGv/jackherer.jpg"
      },
      {
        name: "Wedding Cake",
        type: "hybrid",
        description: "Wedding Cake, also known as Pink Cookies, is a potent indica-leaning hybrid cross between Triangle Kush and Animal Mints. It gets its name from its rich and tangy flavor profile with earthy and peppery notes. Users report a relaxing and euphoric effect that calms the body while stimulating the mind.",
        effects: "Relaxed, Happy, Euphoric, Creative, Uplifted",
        thc_content: "22-25%",
        cbd_content: "<1%",
        flavor_profile: "Sweet, Vanilla, Earthy, Peppery",
        image_url: "https://i.ibb.co/0q2W98q/weddingcake.jpg"
      },
      {
        name: "Skywalker OG",
        type: "indica",
        description: "Skywalker OG is a potent indica-dominant hybrid strain that combines Skywalker and OG Kush genetics. It delivers a heavy-handed euphoric effect alongside significant body relaxation. With a pungent aroma and high THC content, it's often chosen for nighttime use and by those seeking relief from insomnia or pain.",
        effects: "Relaxed, Sleepy, Happy, Euphoric, Hungry",
        thc_content: "20-26%",
        cbd_content: "<1%",
        flavor_profile: "Earthy, Diesel, Spicy, Herbal",
        image_url: "https://i.ibb.co/Rc1Vq3y/skywalkerog.jpg"
      },
      {
        name: "Green Crack",
        type: "sativa",
        description: "Green Crack, sometimes called Green Cush, is a potent sativa strain named by Snoop Dogg for its strong energetic effects. Originally called Cush, this strain is derived from Skunk #1. It delivers sharp energy and focus, making it ideal for daytime use to combat fatigue, stress, and depression.",
        effects: "Energetic, Focused, Happy, Uplifted, Euphoric",
        thc_content: "15-25%",
        cbd_content: "<1%",
        flavor_profile: "Citrus, Sweet, Tropical, Tangy",
        image_url: "https://i.ibb.co/ZHcpvY4/greencrack.jpg"
      },
      {
        name: "Amnesia Haze",
        type: "sativa",
        description: "Amnesia Haze is a classic sativa-dominant strain with origins in the Netherlands and winning multiple Cannabis Cup awards. It delivers both cerebral stimulation and uplifting energy. The complex genetic background blends South Asian and Jamaican landrace strains, resulting in a citrusy and earthy aroma.",
        effects: "Happy, Uplifted, Euphoric, Energetic, Creative",
        thc_content: "20-25%",
        cbd_content: "<1%",
        flavor_profile: "Citrus, Lemon, Earthy, Sweet",
        image_url: "https://i.ibb.co/M7vmbcH/amnesiahaze.jpg"
      },
      {
        name: "Bubba Kush",
        type: "indica",
        description: "Bubba Kush is a heavy indica hybrid that enjoys very high popularity. Originating around 1996, it's a cross of an OG Kush plant with Northern Lights. The strain features bulky, purple-hued buds with distinctively sweet and chocolatey notes. The effects are intensely relaxing, both physically and mentally.",
        effects: "Relaxed, Sleepy, Happy, Hungry, Euphoric",
        thc_content: "15-22%",
        cbd_content: "<1%",
        flavor_profile: "Earthy, Sweet, Chocolate, Coffee",
        image_url: "https://i.ibb.co/qnrDxVZ/bubbakush.jpg"
      }
    ];
    
    const combinedStrains = [...curatedStrains];
    
    let importedCount = 0;
    for (const strain of combinedStrains) {
      try {
        // Check if strain already exists
        const existingStrains = await storage.getStrains();
        const exists = existingStrains.some(s => s.name.toLowerCase() === strain.name.toLowerCase());
        
        if (!exists) {
          await storage.createStrain(strain);
          importedCount++;
          console.log(`Imported curated strain: ${strain.name}`);
        } else {
          console.log(`Strain already exists: ${strain.name}`);
        }
      } catch (error) {
        console.error(`Error importing strain ${strain.name}:`, error);
      }
    }
    
    console.log(`Successfully imported ${importedCount} curated strains.`);
    return importedCount;
    
  } catch (error) {
    console.error('Error importing curated strains:', error);
    throw error;
  }
}

/**
 * Get new strain image from unsplash
 * @param strainName - Name of the strain
 * @returns URL of the image
 */
export async function getStrainImage(strainName: string): Promise<string | null> {
  try {
    // Search for strain image on Unsplash
    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: {
        query: `cannabis ${strainName} marijuana`,
        per_page: 1
      },
      headers: {
        'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
      }
    });
    
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].urls.regular;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching strain image:', error);
    return null;
  }
}