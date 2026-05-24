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
  user_id: number;
  title: string;
  items?: Item[];
}

export interface ContractHistory {
  id: number;
  input_items_cost: string;
  expected_profit: string;
  result_float: number;
  created_at: string;
  market_name?: string;
  image_url?: string;
}

export interface PredictionResult {
  item: Item;
  probability: number;
  result_float: number;
  profit: number;
}