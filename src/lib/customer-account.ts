export interface CustomerRegistration {
  name: string;
  email: string;
  phone: string;
  password: string;
}

/** Public registration always creates a customer; only the server can grant the admin role. */
export function buildCustomerRegistration(input: CustomerRegistration, origin: string) {
  return {
    initialRole: "user" as const,
    credentials: {
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${origin}/auth`,
        data: { full_name: input.name, phone: input.phone },
      },
    },
  };
}
