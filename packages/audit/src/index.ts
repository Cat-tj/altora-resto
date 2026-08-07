import { calculatePromo } from "../src/index";

export function getTenantAuditLogs(tenantId: string) {
  return [
    {
      id: "audit-1",
      tenantId,
      action: "PROMO_CHECK",
      timestamp: new Date().toISOString(),
    },
  ];
}

export function getRecipeCost(recipeId: string) {
  return {
    recipeId,
    estimatedCost: 15000,
    ingredientsCount: 3,
  };
}

export function getMembershipInfo(memberId: string) {
  return {
    memberId,
    tier: "GOLD",
    points: 1500,
  };
}
