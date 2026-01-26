export const CART_OPEN_EVENT = 'hotmess:open-cart';

export const openCartDrawer = (tab) => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(CART_OPEN_EVENT, {
        detail: tab ? { tab: String(tab) } : {},
      })
    );
  } catch {
    // ignore
  }
};
