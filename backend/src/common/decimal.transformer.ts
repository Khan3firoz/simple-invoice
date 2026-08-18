import { ValueTransformer } from 'typeorm';

// Postgres numeric/decimal columns are returned as strings by pg driver; convert to number.
export const DecimalTransformer: ValueTransformer = {
  to: (value?: number) => value,
  from: (value?: string) => (value === null || value === undefined ? value : parseFloat(value)),
};
