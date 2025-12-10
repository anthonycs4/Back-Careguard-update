import * as Joi from 'joi';

export const configSchema = Joi.object({
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_REST_URL: Joi.string().uri().required(),
  SUPABASE_JWKS_URL: Joi.string().uri().required(),

  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
});
