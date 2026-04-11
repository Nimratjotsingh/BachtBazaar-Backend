export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

export const validate = (schema, data) => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(e => e.message);
    throw new ValidationError(errors.join(", "));
  }

  return result.data;
};