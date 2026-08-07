export interface PromoItemInput {
  itemMenuId: string;
  kategoriId?: string;
  jumlah: number;
  hargaSatuan: number;
}

export interface PromoCalculationContext {
  tenantId: string;
  outletId: string;
  totalBelanja: number;
  items: PromoItemInput[];
}

export interface PromoRuleResult {
  promoId: string;
  nama: string;
  diskonPotongan: number;
  appliedItems: string[];
}

export function calculatePromo(context: PromoCalculationContext): PromoRuleResult[] {
  if (context.items.length === 0 || context.totalBelanja <= 0) {
    return [];
  }
  return [];
}
