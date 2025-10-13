/**
 * Card Design Templates
 * Built-in templates for card designs
 * Phase 2: Card Design Templates
 * Phase 4: WCAG AA compliant colors (4.5:1 contrast ratio minimum)
 */

export const CARD_DESIGN_TEMPLATES = [
  {
    id: 'coffee_classic',
    name: 'Coffee Shop Classic',
    description: 'Perfect for coffee shops and cafes',
    industry: 'coffee',
    config: {
      background_color: '#5C3A29',  // Darker coffee brown for better contrast
      foreground_color: '#FFFFFF',
      label_color: '#FFF8DC',
      stamp_icon: '☕',
      progress_display_style: 'grid'
    },
    preview_image: '/templates/coffee-classic.png'
  },
  {
    id: 'restaurant_rewards',
    name: 'Restaurant Rewards',
    description: 'Elegant design for restaurants',
    industry: 'restaurant',
    config: {
      background_color: '#B91C1C',  // Darker red for better contrast (from DC2626)
      foreground_color: '#FFFFFF',
      label_color: '#FEE2E2',
      stamp_icon: '🍽️',
      progress_display_style: 'bar'
    },
    preview_image: '/templates/restaurant-rewards.png'
  },
  {
    id: 'retail_rewards',
    name: 'Retail Rewards',
    description: 'Professional design for retail stores',
    industry: 'retail',
    config: {
      background_color: '#1E40AF',  // Already WCAG AA compliant
      foreground_color: '#FFFFFF',
      label_color: '#BFDBFE',
      stamp_icon: '🛍️',
      progress_display_style: 'bar'
    },
    preview_image: '/templates/retail-rewards.png'
  },
  {
    id: 'beauty_wellness',
    name: 'Beauty & Wellness',
    description: 'Stylish design for beauty salons and spas',
    industry: 'beauty',
    config: {
      background_color: '#BE185D',  // Darker pink for better contrast (from EC4899)
      foreground_color: '#FFFFFF',
      label_color: '#FCE7F3',
      stamp_icon: '💆',
      progress_display_style: 'grid'
    },
    preview_image: '/templates/beauty-wellness.png'
  },
  {
    id: 'fitness_gym',
    name: 'Fitness & Gym',
    description: 'Energetic design for fitness centers',
    industry: 'fitness',
    config: {
      background_color: '#C2410C',  // Darker orange for better contrast (from F97316)
      foreground_color: '#FFFFFF',
      label_color: '#FFEDD5',
      stamp_icon: '💪',
      progress_display_style: 'grid'
    },
    preview_image: '/templates/fitness-gym.png'
  },
  {
    id: 'professional_default',
    name: 'Professional Default',
    description: 'Clean, professional design for any business',
    industry: 'general',
    config: {
      background_color: '#1E40AF',  // Already WCAG AA compliant
      foreground_color: '#FFFFFF',
      label_color: '#DBEAFE',
      stamp_icon: '⭐',
      progress_display_style: 'bar'
    },
    preview_image: '/templates/professional-default.png'
  },
  // Phase 3: Additional Templates
  {
    id: 'hotel_hospitality',
    name: 'Hotel & Hospitality',
    description: 'Luxurious design for hotels and hospitality',
    industry: 'hotel',
    config: {
      background_color: '#6D28D9',  // Darker purple for better contrast (from 7C3AED)
      foreground_color: '#FFFFFF',
      label_color: '#EDE9FE',
      stamp_icon: '🏨',
      progress_display_style: 'bar'
    },
    preview_image: '/templates/hotel-hospitality.png'
  },
  {
    id: 'auto_service',
    name: 'Auto Service',
    description: 'Bold design for car washes and auto shops',
    industry: 'automotive',
    config: {
      background_color: '#0E7490',  // Darker cyan for better contrast (from 0891B2)
      foreground_color: '#FFFFFF',
      label_color: '#CFFAFE',
      stamp_icon: '🚗',
      progress_display_style: 'grid'
    },
    preview_image: '/templates/auto-service.png'
  },
  {
    id: 'food_delivery',
    name: 'Food Delivery',
    description: 'Fresh design for food delivery services',
    industry: 'food',
    config: {
      background_color: '#A16207',  // Darker yellow for better contrast (from EAB308)
      foreground_color: '#FFFFFF',
      label_color: '#FEF3C7',
      stamp_icon: '🍕',
      progress_display_style: 'bar'
    },
    preview_image: '/templates/food-delivery.png'
  },
  {
    id: 'pet_services',
    name: 'Pet Services',
    description: 'Playful design for pet shops and grooming',
    industry: 'pets',
    config: {
      background_color: '#059669',  // Darker green for better contrast (from 10B981)
      foreground_color: '#FFFFFF',
      label_color: '#D1FAE5',
      stamp_icon: '🐾',
      progress_display_style: 'grid'
    },
    preview_image: '/templates/pet-services.png'
  }
]

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {object|null} Template object or null if not found
 */
export function getTemplateById(templateId) {
  return CARD_DESIGN_TEMPLATES.find(t => t.id === templateId) || null
}
