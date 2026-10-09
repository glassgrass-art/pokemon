import { ShopProduct } from '../data/shopData';

const CUSTOM_PRODUCTS_KEY = 'ptcgpocket_merchant_custom_products';
const PRODUCT_OVERRIDES_KEY = 'ptcgpocket_merchant_product_overrides';
const ADMIN_AUTH_KEY = 'ptcgpocket_admin_authenticated';

export interface ProductOverride {
  imageUrl?: string;
  images?: string[];
  galleryLabels?: string[];
  name?: string;
  nameEn?: string;
  price?: string;
  originalPrice?: string;
  targetUrl?: string;
  asin?: string;
  desc?: string;
  hidden?: boolean;
}

/**
 * Loads custom products created by the merchant/admin
 */
export function loadCustomProducts(): ShopProduct[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is ShopProduct => !!p && typeof p === 'object' && !!p.id);
  } catch {
    return [];
  }
}

/**
 * Saves custom products created by the merchant/admin
 */
export function saveCustomProducts(products: ShopProduct[]): void {
  try {
    const safeList = Array.isArray(products)
      ? products.filter((p) => !!p && typeof p === 'object' && !!p.id)
      : [];
    localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(safeList));
  } catch (e) {
    console.error('Failed to save custom products:', e);
  }
}

/**
 * Loads overrides for existing default products (e.g. customized images, renamed, or hidden)
 */
export function loadProductOverrides(): Record<string, ProductOverride> {
  try {
    const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

/**
 * Saves product overrides
 */
export function saveProductOverrides(overrides: Record<string, ProductOverride>): void {
  try {
    const safeObj = overrides && typeof overrides === 'object' && !Array.isArray(overrides) ? overrides : {};
    localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(safeObj));
  } catch (e) {
    console.error('Failed to save product overrides:', e);
  }
}

/**
 * Merges base static products with merchant overrides and custom products
 */
export function getMergedShopProducts(baseProducts: ShopProduct[]): ShopProduct[] {
  const overrides = loadProductOverrides();
  const customProducts = loadCustomProducts();
  const safeBase = Array.isArray(baseProducts)
    ? baseProducts.filter((p): p is ShopProduct => !!p && typeof p === 'object' && !!p.id)
    : [];

  // Apply overrides to base products
  const modifiedBase = safeBase
    .filter((prod) => !overrides[prod.id]?.hidden)
    .map((prod) => {
      const override = overrides[prod.id];
      if (!override || typeof override !== 'object') return prod;
      return {
        ...prod,
        ...override,
        // Ensure arrays are preserved properly
        images: override.images && Array.isArray(override.images) && override.images.length > 0 ? override.images : prod.images,
        galleryLabels: override.galleryLabels && Array.isArray(override.galleryLabels) ? override.galleryLabels : prod.galleryLabels,
      };
    });

  // Combine modified base products with custom merchant products
  return [...customProducts, ...modifiedBase];
}

/**
 * Admin authentication checks
 */
export function isAdminAuthenticated(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminAuthenticated(auth: boolean): void {
  try {
    if (auth) {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_AUTH_KEY);
    }
  } catch {}
}
