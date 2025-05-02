import { storage } from "../storage";
import { askCommand } from "./aiProvider";
import { type Strain } from "@shared/schema";

/**
 * Get a personalized strain recommendation based on a user's preferences or needs
 * @param preferences User's preferences, symptoms, or desired effects
 * @returns A recommendation object with strain details and explanation
 */
export async function getStrainRecommendation(preferences: string): Promise<{
  strain: Strain;
  explanation: string;
}> {
  try {
    // Get all available strains
    const strains = await storage.getStrains();
    
    if (!strains.length) {
      throw new Error("No strains found in database");
    }
    
    // Format strain data for the AI prompt
    const strainData = strains.map(strain => ({
      id: strain.id,
      name: strain.name,
      type: strain.type,
      thc_content: strain.thc_content,
      cbd_content: strain.cbd_content,
      flavor_profile: strain.flavor_profile,
      effects: strain.effects,
    }));
    
    // Prepare AI prompt for strain recommendation
    const prompt = `
      You are a cannabis strain expert. Based on the following user preferences: "${preferences}",
      recommend the most suitable strain from this list:
      
      ${JSON.stringify(strainData, null, 2)}
      
      Provide your answer in JSON format with the following structure:
      {
        "strain_id": (numeric id of the recommended strain),
        "explanation": (detailed explanation of why this strain matches the user's preferences, including potential effects, flavor notes, and any medical benefits)
      }
      
      Only respond with valid JSON. Make sure the strain_id is one of the IDs from the provided list.
    `;
    
    // Get AI recommendation
    const aiResponse = await askCommand(prompt);
    
    // Parse the JSON response
    // Extract the JSON from the AI response which might include additional text
    const jsonMatch = aiResponse.match(/({[\s\S]*})/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }
    
    const recommendationData = JSON.parse(jsonMatch[0]);
    
    // Validate the recommendation
    if (!recommendationData.strain_id || !recommendationData.explanation) {
      throw new Error("Invalid recommendation format");
    }
    
    // Get the full strain details
    const recommendedStrain = await storage.getStrainById(recommendationData.strain_id);
    
    if (!recommendedStrain) {
      throw new Error(`Strain with ID ${recommendationData.strain_id} not found`);
    }
    
    return {
      strain: recommendedStrain,
      explanation: recommendationData.explanation
    };
  } catch (error) {
    console.error("Error getting strain recommendation:", error);
    throw error;
  }
}