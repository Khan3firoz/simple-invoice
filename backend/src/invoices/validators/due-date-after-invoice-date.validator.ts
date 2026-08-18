import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// Validates that the decorated date field is on or after the sibling property named in `relatedPropertyName`.
export function IsDueDateAfterInvoiceDate(
  relatedPropertyName: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'isDueDateAfterInvoiceDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [relatedPropertyName],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as Record<string, any>)[relatedPropertyName];
          if (!value || !relatedValue) return true;
          return new Date(value).getTime() >= new Date(relatedValue).getTime();
        },
      },
    });
  };
}
