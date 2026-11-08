import tonico from "@/assets/produto-tonico.jpg";
import shampoo from "@/assets/produto-shampoo.jpg";
import suplemento from "@/assets/produto-suplemento.jpg";

// Plans, products, affiliate links, shipping and coupons are managed in the admin area
// (database). This file keeps the shared types, labels, price rules and the questionnaire.

export type PlanId = "essencial" | "completo" | "avancado";
export const PLAN_IDS: PlanId[] = ["essencial", "completo", "avancado"];

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  highlight: boolean;
}

export type ProductCategory = "tratamento" | "limpeza" | "suplemento" | "finalizacao";
export type AffiliateStore = "Mercado Livre" | "TikTok Shop";
export const AFFILIATE_STORES: AffiliateStore[] = ["Mercado Livre", "TikTok Shop"];

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  /** Regular price in BRL. */
  price: number;
  /** Promotional price, used while promoUntil has not passed. */
  promoPrice: number | null;
  promoUntil: string | null;
  stock: number;
  deliveryDays: number;
  image: string;
  badge: string | null;
}

export interface AffiliateProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  store: AffiliateStore;
  url: string;
  image: string;
  badge: string | null;
}

export interface StoreSettings {
  shippingFee: number;
  freeShippingMin: number | null;
  lowStockAlert: number;
}

export interface Storefront {
  plans: Plan[];
  products: ShopProduct[];
  affiliates: AffiliateProduct[];
  settings: StoreSettings;
}

export const MAX_QTY_PER_ITEM = 10;

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  tratamento: "Tratamento",
  limpeza: "Limpeza",
  suplemento: "Suplementos",
  finalizacao: "Finalização",
};

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** True while the product's promotional price applies. */
export function hasActivePromo(
  p: Pick<ShopProduct, "price" | "promoPrice" | "promoUntil">,
  now: Date = new Date(),
): boolean {
  if (p.promoPrice == null || p.promoPrice <= 0 || p.promoPrice >= p.price) return false;
  return !p.promoUntil || new Date(p.promoUntil).getTime() > now.getTime();
}

/** Price actually charged right now (promo price while it is valid). */
export function effectivePrice(
  p: Pick<ShopProduct, "price" | "promoPrice" | "promoUntil">,
  now: Date = new Date(),
): number {
  return hasActivePromo(p, now) ? p.promoPrice! : p.price;
}

const FALLBACK_IMAGES: Record<string, string> = {
  "shampoo-cia-cap": shampoo,
  "tonico-cia-cap": tonico,
  "kit-rotina": tonico,
  "kit-finalizacao": suplemento,
  "minoxidil-5": tonico,
  "tonico-capilar": tonico,
  "shampoo-antiqueda": shampoo,
  "condicionador-leve": shampoo,
  biotina: suplemento,
  "pente-madeira": suplemento,
};

const CATEGORY_IMAGES: Record<ProductCategory, string> = {
  tratamento: tonico,
  limpeza: shampoo,
  suplemento: suplemento,
  finalizacao: suplemento,
};

/** Photo for a product without an uploaded image. */
export const fallbackImage = (id: string, category: ProductCategory) =>
  FALLBACK_IMAGES[id] ?? CATEGORY_IMAGES[category] ?? tonico;

/* ---------------- Questionário ---------------- */

export interface QuizOption {
  value: string;
  label: string;
  points: number;
}

export interface QuizQuestion {
  id: QuizKey;
  title: string;
  hint?: string;
  options: QuizOption[];
}

export type QuizKey = "tempo" | "area" | "familia" | "historico" | "objetivo" | "sinais";
export type QuizAnswers = Partial<Record<QuizKey, string>>;

export const QUIZ: QuizQuestion[] = [
  {
    id: "tempo",
    title: "Há quanto tempo você nota a queda?",
    options: [
      { value: "menos-1", label: "Menos de 1 ano", points: 0 },
      { value: "1-3", label: "De 1 a 3 anos", points: 1 },
      { value: "3-5", label: "De 3 a 5 anos", points: 2 },
      { value: "mais-5", label: "Mais de 5 anos", points: 3 },
    ],
  },
  {
    id: "area",
    title: "Onde a queda aparece mais?",
    hint: "Escolha a opção mais parecida com o espelho.",
    options: [
      { value: "entradas", label: "Entradas na testa", points: 1 },
      { value: "coroa", label: "Topo da cabeça (coroa)", points: 1 },
      { value: "difusa", label: "Cabelo mais ralo no geral", points: 1 },
      { value: "extensa", label: "Entradas e coroa juntas", points: 3 },
    ],
  },
  {
    id: "familia",
    title: "Alguém da família tem calvície?",
    options: [
      { value: "sim", label: "Sim, pai ou mãe", points: 1 },
      { value: "parentes", label: "Avós, tios ou irmãos", points: 1 },
      { value: "nao", label: "Não que eu saiba", points: 0 },
    ],
  },
  {
    id: "historico",
    title: "Você já tentou algum tratamento?",
    options: [
      { value: "nunca", label: "Nunca tratei", points: 0 },
      { value: "caseiro", label: "Só shampoos e vitaminas", points: 0 },
      { value: "minoxidil", label: "Já usei minoxidil", points: 1 },
      { value: "sem-resultado", label: "Tratei e não vi resultado", points: 2 },
    ],
  },
  {
    id: "objetivo",
    title: "O que você mais quer agora?",
    options: [
      { value: "parar", label: "Parar a queda", points: 0 },
      { value: "densidade", label: "Recuperar volume", points: 1 },
      { value: "manter", label: "Manter o que tenho", points: 0 },
    ],
  },
  {
    id: "sinais",
    title: "Você notou algum destes sinais?",
    hint: "Isso ajuda o médico a priorizar seu caso.",
    options: [
      { value: "nenhum", label: "Nenhum deles", points: 0 },
      { value: "coceira", label: "Coceira ou caspa forte", points: 1 },
      { value: "falhas", label: "Falhas redondas de repente", points: 0 },
      { value: "subita", label: "Queda muito rápida em semanas", points: 0 },
    ],
  },
];

export interface QuizResult {
  plan: PlanId;
  score: number;
  /** True when the answers suggest the case needs a dermatologist first. */
  needsDermatologist: boolean;
  summary: string;
}

const RED_FLAGS = new Set(["falhas", "subita"]);

export function scoreQuiz(answers: QuizAnswers): number {
  return QUIZ.reduce((sum, q) => {
    const opt = q.options.find((o) => o.value === answers[q.id]);
    return sum + (opt?.points ?? 0);
  }, 0);
}

export function recommendPlan(answers: QuizAnswers): QuizResult {
  const score = scoreQuiz(answers);
  const needsDermatologist = RED_FLAGS.has(answers.sinais ?? "");

  if (needsDermatologist) {
    return {
      plan: "avancado",
      score,
      needsDermatologist,
      summary:
        "Falhas redondas ou queda muito rápida podem ter outras causas. O ideal é passar por um dermatologista antes de qualquer fórmula.",
    };
  }
  if (score <= 3) {
    return {
      plan: "essencial",
      score,
      needsDermatologist,
      summary: "Sua queda parece estar no começo. Tratar cedo costuma dar os melhores resultados.",
    };
  }
  if (score <= 6) {
    return {
      plan: "completo",
      score,
      needsDermatologist,
      summary:
        "Seu caso pede um cuidado combinado: fórmula tópica, possível tratamento oral e rotina de cuidados.",
    };
  }
  return {
    plan: "avancado",
    score,
    needsDermatologist,
    summary:
      "Sua queda é mais antiga ou extensa. Um acompanhamento dermatológico dedicado faz diferença aqui.",
  };
}
