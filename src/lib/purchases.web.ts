// Store purchases only exist in the mobile apps.
export type StorePlan = { code: string; productId: string | null; displayPrice: string | null; offerToken: string | null };
export const storeAvailable = false;
export class PurchaseCancelled extends Error {}
export async function closeStore() {}
export async function loadStorePlans(plans: { code: string }[]): Promise<StorePlan[]> {
  return plans.map((p) => ({ code: p.code, productId: null, displayPrice: null, offerToken: null }));
}
export async function buy(): Promise<void> { throw new Error('Get Premium in the Friends app for Android or iPhone.'); }
export async function restore(): Promise<{ is_premium: boolean }> { throw new Error('Restore purchases in the mobile app.'); }
