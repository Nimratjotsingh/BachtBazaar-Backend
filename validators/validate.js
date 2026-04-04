export const validate = (schema, data) => {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(e => e.message);
    throw new Error(errors.join(", "));
  }

  return result.data;
};