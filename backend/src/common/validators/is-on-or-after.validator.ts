import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// Cross-field validator: asserts the decorated date property is >= another
// date property on the same DTO (e.g. dueDate >= invoiceDate).
export function IsOnOrAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isOnOrAfter',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          if (!value || !relatedValue) return true;
          return (
            new Date(value).getTime() >=
            new Date(relatedValue as string).getTime()
          );
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          return `${args.property} must be on or after ${relatedPropertyName}`;
        },
      },
    });
  };
}
