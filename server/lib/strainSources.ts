import axios from 'axios';
import { InsertStrain } from '@shared/schema';

// Define interfaces for different API responses
interface OtreebaStrain {
  name: string;
  type?: string;
  lineage?: Record<string, string>;
  desc?: string;
}

interface StrainAPIStrain {
  id: number;
  name: string;
  race: string;
  flavors?: string[];
  effects?: {
    positive?: string[];
    negative?: string[];
    medical?: string[];
  };
  desc?: string;
}

interface CannaConnectStrain {
  name: string;
  category: string;
  thc?: string;
  cbd?: string;
  description?: string;
  effects?: string[];
  flavors?: string[];
  image?: string;
}

/**
 * Convert strain race to standardized type
 * @param race - The strain race/category from APIs
 * @returns Standardized strain type
 */
function standardizeStrainType(race: string | undefined): 'indica' | 'sativa' | 'hybrid' {
  if (!race) return 'hybrid';
  
  const lowerRace = race.toLowerCase();
  if (lowerRace.includes('indica')) return 'indica';
  if (lowerRace.includes('sativa')) return 'sativa';
  if (lowerRace.includes('hybrid')) return 'hybrid';
  
  // Default to hybrid if unknown
  return 'hybrid';
}

/**
 * Fetch strains from Otreeba API
 * @param limit - Number of strains to fetch
 * @returns Array of Strain objects
 */
export async function fetchOtreebaStrains(limit = 50): Promise<InsertStrain[]> {
  try {
    const response = await axios.get(`https://api.otreeba.com/v1/strains?count=${limit}&sort=name`);
    const data = response.data.data || [];
    
    return await Promise.all(data.map(async (strain: OtreebaStrain) => {
      // Get more details about the strain
      try {
        const detailResponse = await axios.get(`https://api.otreeba.com/v1/strains/${strain.name.toLowerCase().replace(/\s+/g, '-')}`);
        const details = detailResponse.data;
        
        return {
          name: strain.name,
          type: standardizeStrainType(strain.type),
          description: details.desc || `${strain.name} is a ${standardizeStrainType(strain.type)} strain. ${strain.lineage ? `It has lineage from: ${Object.keys(strain.lineage).join(', ')}.` : ''}`,
          effects: null,
          flavor_profile: null,
          thc_content: null,
          cbd_content: null,
          image_url: null
        };
      } catch (error) {
        // If detail fetch fails, return basic info
        return {
          name: strain.name,
          type: standardizeStrainType(strain.type),
          description: `${strain.name} is a ${standardizeStrainType(strain.type)} strain.`,
          effects: null,
          flavor_profile: null,
          thc_content: null,
          cbd_content: null,
          image_url: null
        };
      }
    }));
  } catch (error) {
    console.error('Error fetching from Otreeba API:', error);
    return [];
  }
}

/**
 * Fetch strains from StrainAPI
 * @param apiKey - API key for StrainAPI
 * @param limit - Number of strains to fetch
 * @returns Array of Strain objects
 */
export async function fetchStrainAPIStrains(apiKey: string, limit = 50): Promise<InsertStrain[]> {
  try {
    // Fetch all strains - need API key for this endpoint
    if (!apiKey) {
      console.warn('No API key provided for StrainAPI');
      return [];
    }
    
    const response = await axios.get(`https://strainapi.evanbusse.com/${apiKey}/strains/search/all`);
    const strainsData: Record<string, StrainAPIStrain> = response.data;
    
    // Convert to array and limit
    const strains = Object.values(strainsData).slice(0, limit);
    
    return await Promise.all(strains.map(async (strain) => {
      try {
        // Fetch strain details
        const descResponse = await axios.get(`https://strainapi.evanbusse.com/${apiKey}/strains/data/desc/${strain.id}`);
        const flavorsResponse = await axios.get(`https://strainapi.evanbusse.com/${apiKey}/strains/data/flavors/${strain.id}`);
        const effectsResponse = await axios.get(`https://strainapi.evanbusse.com/${apiKey}/strains/data/effects/${strain.id}`);
        
        const description = descResponse.data || 'No description available.';
        const flavors = flavorsResponse.data || [];
        const effects = effectsResponse.data || {};
        
        // Format effects
        const positiveEffects = effects.positive ? effects.positive.join(', ') : '';
        const flavorList = flavors.join(', ');
        
        return {
          name: strain.name,
          type: standardizeStrainType(strain.race),
          description: description,
          effects: positiveEffects || null,
          flavor_profile: flavorList || null,
          thc_content: null, // API doesn't provide THC content
          cbd_content: null, // API doesn't provide CBD content
          image_url: null
        };
      } catch (error) {
        // If detail fetch fails, return basic info
        return {
          name: strain.name,
          type: standardizeStrainType(strain.race),
          description: 'No description available.',
          effects: null,
          flavor_profile: null,
          thc_content: null,
          cbd_content: null,
          image_url: null
        };
      }
    }));
  } catch (error) {
    console.error('Error fetching from StrainAPI:', error);
    return [];
  }
}

/**
 * Fetch strain images from Unsplash
 * @param accessKey - Unsplash access key
 * @param strainName - Strain name
 * @returns Image URL or null
 */
export async function fetchStrainImage(accessKey: string | undefined, strainName: string): Promise<string | null> {
  if (!accessKey) return null;
  
  try {
    // Search for strain image on Unsplash
    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: {
        query: `cannabis ${strainName} marijuana`,
        per_page: 1
      },
      headers: {
        'Authorization': `Client-ID ${accessKey}`
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

/**
 * Fetch strains from CannaConnect API (placeholder - actual implementation would need proper API key)
 * @param apiKey - API key for CannaConnect
 * @param limit - Number of strains to fetch
 * @returns Array of Strain objects
 */
export async function fetchCannaConnectStrains(apiKey: string | undefined, limit = 50): Promise<InsertStrain[]> {
  // This is a placeholder for integration with another cannabis API
  // In a real implementation, you would use the API key to authenticate
  if (!apiKey) {
    console.warn('No API key provided for CannaConnect API');
    return [];
  }
  
  try {
    // This endpoint is just an example - you would replace with actual API endpoint
    const response = await axios.get(`https://api.cannaconnect.example/v1/strains?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const strains: CannaConnectStrain[] = response.data.results || [];
    
    return strains.map(strain => ({
      name: strain.name,
      type: standardizeStrainType(strain.category),
      description: strain.description || `${strain.name} is a ${standardizeStrainType(strain.category)} strain.`,
      effects: strain.effects ? strain.effects.join(', ') : null,
      flavor_profile: strain.flavors ? strain.flavors.join(', ') : null,
      thc_content: strain.thc || null,
      cbd_content: strain.cbd || null,
      image_url: strain.image || null
    }));
  } catch (error) {
    console.error('Error fetching from CannaConnect API:', error);
    return [];
  }
}

/**
 * Fetch strains from multiple sources
 * @param apiKeys - Object containing API keys for different sources
 * @param limit - Maximum number of strains to fetch per source
 * @returns Combined array of unique Strain objects
 */
export async function fetchStrainsFromMultipleSources(
  apiKeys: {
    strainApi?: string;
    unsplash?: string;
    cannaConnect?: string;
  },
  limit = 50
): Promise<InsertStrain[]> {
  // Fetch from all available sources in parallel
  const [otreebaStrains, strainApiStrains, cannaConnectStrains] = await Promise.all([
    fetchOtreebaStrains(limit),
    apiKeys.strainApi ? fetchStrainAPIStrains(apiKeys.strainApi, limit) : Promise.resolve([]),
    apiKeys.cannaConnect ? fetchCannaConnectStrains(apiKeys.cannaConnect, limit) : Promise.resolve([])
  ]);
  
  // Combine all strains
  const allStrains = [...otreebaStrains, ...strainApiStrains, ...cannaConnectStrains];
  
  // Remove duplicates based on strain name
  const uniqueStrains = Array.from(
    allStrains.reduce((map, strain) => {
      const lowerName = strain.name.toLowerCase();
      if (!map.has(lowerName) || strain.description.length > (map.get(lowerName)?.description.length || 0)) {
        map.set(lowerName, strain);
      }
      return map;
    }, new Map<string, InsertStrain>())
  ).map(([_, strain]) => strain);
  
  // If Unsplash API key is provided, try to add images to strains that don't have them
  if (apiKeys.unsplash) {
    for (const strain of uniqueStrains) {
      if (!strain.image_url) {
        // Wait a bit between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        strain.image_url = await fetchStrainImage(apiKeys.unsplash, strain.name);
      }
    }
  }
  
  return uniqueStrains;
}