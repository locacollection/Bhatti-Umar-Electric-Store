import { supabase } from '../config/supabase.js';

export async function listProducts({ category } = {}) {
  let query = supabase
    .from('products')
    .select('id,name,category,category_id,price,description,sku,image_url,active,inventory(quantity)')
    .eq('active', true)
    .order('name');

  if (category && category !== 'All') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(({ inventory, ...product }) => ({
    ...product,
    stock_quantity: inventory?.quantity ?? 0
  }));
}
