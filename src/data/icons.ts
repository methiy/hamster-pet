// src/data/icons.ts
// Centralized icon imports for all item categories.
// Vite resolves these at build time to hashed URLs.

// --- Food icons ---
import foodSunflower from '../assets/icons/food-sunflower.png'
import foodBread from '../assets/icons/food-bread.png'
import foodStrawberry from '../assets/icons/food-strawberry.png'
import foodApple from '../assets/icons/food-apple.png'
import foodCheese from '../assets/icons/food-cheese.png'
import foodCupcake from '../assets/icons/food-cupcake.png'
import foodNuts from '../assets/icons/food-nuts.png'
import foodDeluxeMeal from '../assets/icons/food-deluxe_meal.png'

// --- Gear icons ---
import gearTent from '../assets/icons/gear-tent.png'
import gearScarf from '../assets/icons/gear-scarf.png'
import gearTreasureMap from '../assets/icons/gear-treasure_map.png'
import gearBoatTicket from '../assets/icons/gear-boat_ticket.png'
import gearTelescope from '../assets/icons/gear-telescope.png'

export const foodIcons: Record<string, string> = {
  sunflower: foodSunflower,
  bread: foodBread,
  strawberry: foodStrawberry,
  apple: foodApple,
  cheese: foodCheese,
  cupcake: foodCupcake,
  nuts: foodNuts,
  deluxe_meal: foodDeluxeMeal,
}

export const gearIcons: Record<string, string> = {
  tent: gearTent,
  scarf: gearScarf,
  treasure_map: gearTreasureMap,
  boat_ticket: gearBoatTicket,
  telescope: gearTelescope,
}
