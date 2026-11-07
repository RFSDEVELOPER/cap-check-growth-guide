import tonico from "@/assets/produto-tonico.jpg";
import shampoo from "@/assets/produto-shampoo.jpg";
import suplemento from "@/assets/produto-suplemento.jpg";

export type PlanId = "essencial" | "completo" | "avancado";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    price: 89,
    tagline: "Para começar cedo e frear a queda.",
    features: [
      "Avaliação médica por telemedicina",
      "Fórmula tópica manipulada",
      "Reposição mensal em casa",
      "Acompanhamento por chat",
    ],
  },
  {
    id: "completo",
    name: "Completo",
    price: 149,
    tagline: "O plano que a maioria escolhe.",
    highlight: true,
    features: [
      "Tudo do Essencial",
      "Tratamento oral, se indicado",
      "Shampoo e tônico próprios",
      "Reavaliação trimestral inclusa",
    ],
  },
  {
    id: "avancado",
    name: "Avançado",
    price: 219,
    tagline: "Para quedas antigas ou extensas.",
    features: [
      "Tudo do Completo",
      "Consulta dermatológica dedicada",
      "Kit de finalização (pomada e cera)",
      "Prioridade no suporte",
    ],
  },
];

export const getPlan = (id: PlanId) => PLANS.find((p) => p.id === id)!;

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const getPlanById = (id: string) => PLANS.find((p) => p.id === id);

export type ProductCategory = "tratamento" | "limpeza" | "suplemento" | "finalizacao";

export type AffiliateStore = "Mercado Livre" | "TikTok Shop";

export interface AffiliateProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  store: AffiliateStore;
  /** Replace with the real affiliate link. */
  url: string;
  image: string;
  badge?: string;
}

/* ---------------- Loja própria (carrinho + Mercado Pago) ---------------- */

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  /** Price in BRL. The server recalculates totals from this list, never from the browser. */
  price: number;
  image: string;
  badge?: string;
}

// Placeholder products and prices until the owner confirms the real ones.
export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "shampoo-cia-cap",
    name: "Shampoo Cia Cap 250 ml",
    description: "Limpeza suave para o dia a dia de quem trata a queda.",
    category: "limpeza",
    price: 59,
    image: shampoo,
    badge: "Marca própria",
  },
  {
    id: "tonico-cia-cap",
    name: "Tônico Cia Cap 100 ml",
    description: "Tônico para massagem no couro cabeludo, complementa a fórmula do plano.",
    category: "tratamento",
    price: 79,
    image: tonico,
  },
  {
    id: "kit-rotina",
    name: "Kit Rotina: shampoo + tônico",
    description: "Os dois produtos juntos, com desconto em relação à compra separada.",
    category: "tratamento",
    price: 119,
    image: tonico,
    badge: "Economize",
  },
  {
    id: "kit-finalizacao",
    name: "Kit Finalização: pomada + cera",
    description: "Para dar volume e textura sem pesar nos fios.",
    category: "finalizacao",
    price: 69,
    image: suplemento,
  },
];

export const getShopProduct = (id: string) => SHOP_PRODUCTS.find((p) => p.id === id);

/** Shipping fee in BRL charged on every order. Placeholder until the owner confirms. */
export const SHIPPING_FEE = 0;
export const MAX_QTY_PER_ITEM = 10;

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  tratamento: "Tratamento",
  limpeza: "Limpeza",
  suplemento: "Suplementos",
  finalizacao: "Finalização",
};

// Affiliate links are placeholders until the owner provides the real ones.
export const PRODUCTS: AffiliateProduct[] = [
  {
    id: "minoxidil-5",
    name: "Minoxidil 5% tópico",
    description: "Solução capilar de venda livre em farmácias. Uso diário no couro cabeludo.",
    category: "tratamento",
    store: "Mercado Livre",
    url: "#",
    image: tonico,
    badge: "Mais vendido",
  },
  {
    id: "tonico-capilar",
    name: "Tônico fortalecedor",
    description: "Complemento ao tratamento, com ativos que ajudam na saúde do couro cabeludo.",
    category: "tratamento",
    store: "TikTok Shop",
    url: "#",
    image: tonico,
  },
  {
    id: "shampoo-antiqueda",
    name: "Shampoo antiqueda",
    description: "Limpeza suave que não resseca, ideal para quem usa minoxidil.",
    category: "limpeza",
    store: "Mercado Livre",
    url: "#",
    image: shampoo,
    badge: "Combina com o plano",
  },
  {
    id: "condicionador-leve",
    name: "Condicionador leve",
    description: "Hidrata o fio sem pesar a raiz.",
    category: "limpeza",
    store: "Mercado Livre",
    url: "#",
    image: shampoo,
  },
  {
    id: "biotina",
    name: "Suplemento de biotina",
    description: "Vitaminas para cabelo e unhas. Converse com o médico antes de usar.",
    category: "suplemento",
    store: "TikTok Shop",
    url: "#",
    image: suplemento,
  },
  {
    id: "pente-madeira",
    name: "Pente de madeira",
    description: "Desembaraça sem quebrar o fio e sem eletricidade estática.",
    category: "finalizacao",
    store: "TikTok Shop",
    url: "#",
    image: suplemento,
  },
];

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
