import Plan from "./schema.js";

const normalizePlanId = (id) =>
  id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeText = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
};

const normalizeFeatureList = (features = []) =>
  features.map((feature) => String(feature).trim()).filter(Boolean);

const normalizePayload = (payload, { deriveIdFromName = false } = {}) => {
  return {
    ...(payload.id
      ? { id: normalizePlanId(payload.id) }
      : deriveIdFromName && payload.name
        ? { id: normalizePlanId(payload.name) }
        : {}),
    ...(payload.name !== undefined ? { name: String(payload.name).trim() } : {}),
    ...(payload.priceMonthly !== undefined
      ? { priceMonthly: Number(payload.priceMonthly) }
      : {}),
    ...(payload.priceYearly !== undefined
      ? {
          priceYearly:
            payload.priceYearly === null ? null : Number(payload.priceYearly),
        }
      : {}),
    ...(payload.description !== undefined
      ? { description: normalizeText(payload.description) }
      : {}),
    ...(payload.features !== undefined
      ? { features: normalizeFeatureList(payload.features) }
      : {}),
    ...(payload.linksPerMonth !== undefined
      ? { linksPerMonth: payload.linksPerMonth === null ? null : Number(payload.linksPerMonth) }
      : {}),
    ...(payload.qrCodesPerMonth !== undefined
      ? { qrCodesPerMonth: payload.qrCodesPerMonth === null ? null : Number(payload.qrCodesPerMonth) }
      : {}),
    ...(payload.analyticsLinksPerMonth !== undefined
      ? {
          analyticsLinksPerMonth:
            payload.analyticsLinksPerMonth === null
              ? null
              : Number(payload.analyticsLinksPerMonth),
        }
      : {}),
    ...(payload.reportsLinksPerMonth !== undefined
      ? {
          reportsLinksPerMonth:
            payload.reportsLinksPerMonth === null
              ? null
              : Number(payload.reportsLinksPerMonth),
        }
      : {}),
    ...(payload.isPopular !== undefined ? { isPopular: payload.isPopular } : {}),
    ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
  };
};

const toPlanResponse = (plan) => ({
  id: plan.id,
  name: plan.name,
  priceMonthly: plan.priceMonthly,
  priceYearly: plan.priceYearly,
  description: plan.description,
  features: plan.features,
  linksPerMonth: plan.linksPerMonth,
  qrCodesPerMonth: plan.qrCodesPerMonth,
  analyticsLinksPerMonth: plan.analyticsLinksPerMonth,
  reportsLinksPerMonth: plan.reportsLinksPerMonth,
  isPopular: plan.isPopular,
  isActive: plan.isActive,
  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,
});

export const getAllPlans = async () => {
  const plans = await Plan.find({ isActive: true })
    .sort({ isPopular: -1, createdAt: 1 })
    .lean();

  return plans.map((plan) => toPlanResponse(plan));
};

export const createPlan = async (payload) => {
  const normalized = normalizePayload(payload, { deriveIdFromName: true });

  if (!normalized.id) {
    throw new Error("Plan id is required");
  }

  const existingPlan = await Plan.findOne({ id: normalized.id });
  if (existingPlan) {
    throw new Error("Plan id already exists");
  }

  const plan = await Plan.create({
    ...normalized,
    isActive: normalized.isActive ?? true,
  });

  return toPlanResponse(plan.toObject());
};

export const updatePlan = async (planId, payload) => {
  const plan = await Plan.findOne({ id: planId, isActive: true });

  if (!plan) {
    throw new Error("Plan not found");
  }

  const normalized = normalizePayload(payload);

  if (normalized.id && normalized.id !== plan.id) {
    const duplicate = await Plan.findOne({ id: normalized.id, _id: { $ne: plan._id } });
    if (duplicate) {
      throw new Error("Plan id already exists");
    }
  }

  Object.assign(plan, normalized);

  await plan.save();

  return toPlanResponse(plan.toObject());
};

export const deletePlan = async (planId) => {
  const plan = await Plan.findOne({ id: planId, isActive: true });

  if (!plan) {
    throw new Error("Plan not found");
  }

  plan.isActive = false;
  plan.deletedAt = new Date();

  await plan.save();

  return { id: plan.id };
};

export const markPlanAsPopular = async (planId) => {
  const plan = await Plan.findOne({ id: planId, isActive: true });

  if (!plan) {
    throw new Error("Plan not found");
  }

  await Plan.updateMany(
    { isActive: true, isPopular: true },
    { $set: { isPopular: false } },
  );

  plan.isPopular = true;
  await plan.save();

  return toPlanResponse(plan.toObject());
};
