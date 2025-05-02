import { ChatInputCommandInteraction } from 'discord.js';
import { storage } from '../storage';
import { getStrainRecommendation } from './strainRecommender';

/**
 * Discord command handler for strain-recommend command
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 */
export async function handleStrainRecommendCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  // Get user preferences from command options
  const preferences = interaction.options.getString('preferences', true);
  
  // Defer reply since AI processing might take some time
  await interaction.deferReply();
  
  // Create loading animation
  const { createLoadingAnimation } = require('./loadingAnimations');
  const stopLoading = createLoadingAnimation(interaction, 'strain-recommend');
  
  try {
    // Get recommendation from AI
    const { strain, explanation } = await getStrainRecommendation(preferences);
    
    // Create a detailed embed message
    const recommendEmbed: any = {
      title: `🌿 Recommended Strain: ${strain.name}`,
      description: strain.description,
      color: strain.type === 'indica' ? 0x6B4EE0 : strain.type === 'sativa' ? 0xE04E4E : 0x4EE078, // Purple for indica, red for sativa, green for hybrid
      thumbnail: {
        url: 'https://kushcookies.com/wp-content/uploads/2021/06/logo7.png' // Default KushCookies logo
      },
      fields: [
        {
          name: 'Type',
          value: strain.type.charAt(0).toUpperCase() + strain.type.slice(1),
          inline: true
        },
        {
          name: 'AI Recommendation Reason',
          value: explanation,
          inline: false
        }
      ],
      footer: {
        text: 'AI-Powered Strain Recommendation by kUShCOOKIES'
      },
      timestamp: new Date().toISOString()
    };
    
    // Add optional fields if present
    if (strain.thc_content) {
      recommendEmbed.fields.push({
        name: 'THC Content',
        value: strain.thc_content,
        inline: true
      });
    }
    
    if (strain.cbd_content) {
      recommendEmbed.fields.push({
        name: 'CBD Content',
        value: strain.cbd_content,
        inline: true
      });
    }
    
    if (strain.flavor_profile) {
      recommendEmbed.fields.push({
        name: 'Flavor Profile',
        value: strain.flavor_profile,
        inline: true
      });
    }
    
    if (strain.effects) {
      recommendEmbed.fields.push({
        name: 'Effects',
        value: strain.effects,
        inline: true
      });
    }
    
    // Add image if available
    if (strain.image_url) {
      recommendEmbed.image = {
        url: strain.image_url
      };
    }
    
    // Send the response
    await interaction.editReply({ 
      content: `Based on your preferences: "${preferences}"`,
      embeds: [recommendEmbed] 
    });
    
  } catch (error) {
    console.error('Error in strain-recommend command:', error);
    await interaction.editReply({
      content: `Error getting strain recommendation: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure your strain database is populated. Try using /strain-import to add strains first.`
    });
  } finally {
    // Clean up the loading animation
    stopLoading();
  }
}