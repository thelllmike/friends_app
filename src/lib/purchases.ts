// Google Play / App Store subscriptions via expo-iap. The backend verifies every receipt before granting Premium.
import { Platform } from 'react-native';
import {
  endConnection, ErrorCode, fetchProducts, finishTransaction, getAvailablePurchases, initConnection,
  purchaseErrorListener, purchaseUpdatedListener, requestPurchase,
} from 'expo-iap';
import { api } from './api';

export type StorePlan = { code: string; productId: string | null; displayPrice: string | null; offerToken: string | null };
export const storeAvailable = true;

let connected = false;
async function ensure() {
  if (!connected) { await initConnection(); connected = true; }
}

export async function closeStore() {
  if (connected) { try { await endConnection(); } catch { /* ignore */ } connected = false; }
}

/** Store prices for our plans (null price if the product isn't set up in the store yet). */
export async function loadStorePlans(plans: { code: string; google_product_id: string | null; apple_product_id: string | null }[]): Promise<StorePlan[]> {
  const idFor = (p: typeof plans[number]) => (Platform.OS === 'ios' ? p.apple_product_id : p.google_product_id);
  const skus = plans.map(idFor).filter((x): x is string => !!x);
  let products: any[] = [];
  if (skus.length) {
    try { await ensure(); products = (await fetchProducts({ skus, type: 'subs' })) as any[]; } catch { products = []; }
  }
  return plans.map((p) => {
    const id = idFor(p);
    const prod = products.find((x) => x.id === id);
    const offer = prod?.subscriptionOffers?.find((o: any) => o.offerTokenAndroid) ?? null;
    return { code: p.code, productId: id, displayPrice: prod?.displayPrice ?? null, offerToken: offer?.offerTokenAndroid ?? null };
  });
}

async function verifyWithServer(purchase: any) {
  if (Platform.OS === 'ios') {
    const tx = purchase.originalTransactionIdentifierIOS || purchase.transactionId || purchase.id;
    return api('/premium/verify/apple', { method: 'POST', body: { transaction_id: String(tx), product_id: purchase.productId } });
  }
  return api('/premium/verify/google', { method: 'POST', body: { product_id: purchase.productId, purchase_token: purchase.purchaseToken } });
}

export class PurchaseCancelled extends Error {}

/** Starts the store sheet and resolves once the server has verified the purchase. */
export async function buy(plan: StorePlan): Promise<void> {
  if (!plan.productId) throw new Error('This plan is not available in the store yet.');
  await ensure();
  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => { if (!done) { done = true; okSub.remove(); errSub.remove(); fn(); } };
    const okSub = purchaseUpdatedListener(async (purchase: any) => {
      if (purchase.productId !== plan.productId) return;
      try {
        await verifyWithServer(purchase);
        await finishTransaction({ purchase, isConsumable: false });
        finish(resolve);
      } catch (e) { finish(() => reject(e)); }
    });
    const errSub = purchaseErrorListener((e: any) => {
      finish(() => reject(e?.code === ErrorCode.UserCancelled ? new PurchaseCancelled() : new Error(e?.message || 'Purchase failed')));
    });
    const request = Platform.OS === 'ios'
      ? { apple: { sku: plan.productId! } }
      : { google: { skus: [plan.productId!], subscriptionOffers: plan.offerToken ? [{ sku: plan.productId!, offerToken: plan.offerToken }] : undefined } };
    requestPurchase({ type: 'subs', request } as any).catch((e: any) =>
      finish(() => reject(e?.code === ErrorCode.UserCancelled ? new PurchaseCancelled() : e)));
  });
}

/** Sends every store purchase on this device to the server so Premium is restored after reinstall. */
export async function restore(): Promise<{ is_premium: boolean }> {
  await ensure();
  const purchases: any[] = (await getAvailablePurchases()) as any[];
  if (Platform.OS === 'ios') {
    const ids = [...new Set(purchases.map((p) => String(p.originalTransactionIdentifierIOS || p.transactionId || p.id)).filter(Boolean))].slice(0, 20);
    return api('/premium/restore', { method: 'POST', body: { platform: 'apple', transaction_ids: ids } });
  }
  const list = purchases.filter((p) => p.purchaseToken).map((p) => ({ product_id: p.productId, purchase_token: p.purchaseToken }));
  return api('/premium/restore', { method: 'POST', body: { platform: 'google', purchases: list } });
}
