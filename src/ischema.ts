import * as joi from 'joi';

import j2s from 'joi-to-swagger';
import { ObjectSchema } from 'joi';
import { Tags } from './index';

export interface ISchema {
  type?: string;
  required?: boolean;
  items?: ISchema;
  $ref?: Function;
}

export const toSwagger = (iSchema: ISchema | joi.Schema): any => {
  if (joi.isSchema(iSchema)) {
    return j2s(iSchema as ObjectSchema).swagger;
  }
  let items;
  let $ref: any = iSchema['$ref'];
  let description;
  if (iSchema['items']) {
    items = toSwagger(iSchema['items']);
    $ref = items['$ref'];
  }
  if ($ref && $ref[Tags.tagDefinitionName]) {
    description = $ref[Tags.tagDefinitionDescription];
    $ref = '#/definitions/' + $ref[Tags.tagDefinitionName];
    return { $ref, description };
  }
  let result = { items, type: iSchema['type'] || 'object', $ref, description };
  if (iSchema['required']) {
    result = Object.assign(result, { required: iSchema['required'] });
  }
  return result;
};

export const toSchema = (joiSchema: ObjectSchema) => {
  return j2s(joiSchema).swagger;
};

export const toJoi = (iSchema: ISchema | joi.Schema): joi.Schema | ISchema => {
  if (joi.isSchema(iSchema)) {
    return iSchema;
  }
  const type = iSchema['type'] || 'object';
  let schema = null;
  const Ref: any = iSchema['$ref'] || (iSchema['items'] && iSchema['items'].$ref);
  let keys = {};
  if (Ref) {
    const ref = new Ref();
    keys = Object.assign({}, ref);
  }

  if (joi[type]) {
    schema = joi[type]();
  }
  if (schema && Ref && Ref[Tags.tagDefinitionDescription]) {
    schema = schema.description(Ref[Tags.tagDefinitionDescription]);
  }
  if (schema && iSchema['required']) {
    schema = schema.required();
  }
  switch (type) {
    case 'object':
      return schema ? schema.keys(keys) : null;
    case 'array':
      return schema ? schema.items(keys) : null;
    case 'file':
      return iSchema['required'] ? joi.object().required() : joi.object();
    default:
      return schema;
  }
};
