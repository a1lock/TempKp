export interface User {
  id: number;
  email: string;
  role: string;
}

export interface Item {
  id: number;
  market_name: string;
  weapon_type: string;
  rarity: string;
  exterior: string;
  price: string | number;
  color_hex: string;
  image_url: string;
  min_float: number;
  max_float: number;
}

export interface Collection {
  id: number;
  title: string;
  items?: Item[];
}