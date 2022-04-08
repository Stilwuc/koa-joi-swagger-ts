import * as joi from 'joi';
import { BaseContext } from 'koa';
import { ISchema, toJoi, toSwagger } from './ischema';
import { registerMethod, registerMiddleware } from './utils';
import { HTTPStatusCodes, IPath, Tags } from './index';

const RESPONSES: Map<Function, Map<string, Map<number, joi.Schema>>> = new Map();

export const response =
  (code: number, schema: joi.Schema = joi.string().default('')): MethodDecorator =>
  (target: {}, key: string): void => {
    if (!RESPONSES.has(target.constructor)) {
      RESPONSES.set(target.constructor, new Map());
    }

    if (!RESPONSES.get(target.constructor).has(key)) {
      RESPONSES.get(target.constructor).set(key, new Map());
    }

    registerMethod(target, key, (router: IPath): void => {
      if (!router.responses) {
        router.responses = {};
      }

      const swaggerSchema = toSwagger(schema);
      let description = '';
      if (swaggerSchema.description) {
        description = swaggerSchema.description;
        delete swaggerSchema.description;
      }
      router.responses[code] = { description, schema: swaggerSchema };
    });

    registerMiddleware(target, key, async (ctx: BaseContext, next: Function): Promise<void> => {
      await next();
      if (RESPONSES.get(target.constructor).get(key).has(ctx.status)) {
        const { error, value } = joi
          .object(RESPONSES.get(target.constructor).get(key).get(ctx.status))
          .validate(ctx.body);
        if (error) {
          ctx.body = { code: HTTPStatusCodes.internalServerError, message: error.message };
          ctx.status = HTTPStatusCodes.internalServerError;
          return;
        }
        ctx.body = value;
      }
    });

    RESPONSES.get(target.constructor).get(key).set(code, schema);
    target[Tags.tagResponse] = target.constructor[Tags.tagResponse] = RESPONSES.get(target.constructor);
  };
