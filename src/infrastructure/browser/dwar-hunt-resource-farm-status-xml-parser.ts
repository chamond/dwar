import { UnexpectedServerResponseError } from '../../application/errors/unexpected-server-response-error';
import { HuntResourceFarmStatus } from '../../domain/entities/hunt-resource-farm-status';

export class DwarHuntResourceFarmStatusXmlParser {
  parse(xmlText: string): HuntResourceFarmStatus {
    const document = new DOMParser().parseFromString(xmlText, 'application/xml');
    const parserError = document.querySelector('parsererror');

    if (parserError) {
      throw new UnexpectedServerResponseError('Resource mining status response is not valid XML.');
    }

    if (document.documentElement.nodeName !== 'req') {
      throw new UnexpectedServerResponseError('Resource mining status response has an unexpected root element.');
    }

    const element = document.documentElement;

    return HuntResourceFarmStatus.create({
      serverNumber: getRequiredAttribute(element, 'num'),
      createdAt: getIntegerAttribute(element, 'ctime'),
      finishAt: getIntegerAttribute(element, 'ftime'),
      startedAt: getIntegerAttribute(element, 'stime'),
      farmStatus: getIntegerAttribute(element, 'farm'),
      professionId: getIntegerAttribute(element, 'prof'),
      name: getRequiredAttribute(element, 'name'),
      firstFarmer: getBooleanAttribute(element, 'first_farmer'),
      status: getIntegerAttribute(element, 'status')
    });
  }
}

function getRequiredAttribute(element: Element, name: string): string {
  const value = element.getAttribute(name);

  if (value === null || value.trim().length === 0) {
    throw new UnexpectedServerResponseError(`Missing "${name}" attribute in resource mining status response.`);
  }

  return value;
}

function getIntegerAttribute(element: Element, name: string): number {
  const value = getRequiredAttribute(element, name);

  if (!/^\d+$/.test(value)) {
    throw new UnexpectedServerResponseError(`Attribute "${name}" must be a non-negative integer.`);
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue)) {
    throw new UnexpectedServerResponseError(`Attribute "${name}" exceeds the supported integer range.`);
  }

  return parsedValue;
}

function getBooleanAttribute(element: Element, name: string): boolean {
  const value = getRequiredAttribute(element, name);

  if (value === '0') {
    return false;
  }

  if (value === '1') {
    return true;
  }

  throw new UnexpectedServerResponseError(`Attribute "${name}" must be 0 or 1.`);
}
