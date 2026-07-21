import { HuntResourceFarmStart } from '../../domain/entities/hunt-resource-farm-start';

export class DwarHuntResourceFarmStartXmlParser {
  parse(xmlText: string): HuntResourceFarmStart {
    const document = new DOMParser().parseFromString(xmlText, 'application/xml');
    const parserError = document.querySelector('parsererror');

    if (parserError) {
      throw new Error('Resource mining start response is not valid XML.');
    }

    if (document.documentElement.nodeName !== 'req') {
      throw new Error('Resource mining start response has an unexpected root element.');
    }

    const element = document.documentElement;

    return HuntResourceFarmStart.create({
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

  if (value === null) {
    throw new Error(`Missing "${name}" attribute in resource mining start response.`);
  }

  return value;
}

function getIntegerAttribute(element: Element, name: string): number {
  const value = getRequiredAttribute(element, name);

  if (!/^\d+$/.test(value)) {
    throw new Error(`Attribute "${name}" must be a non-negative integer.`);
  }

  return Number(value);
}

function getBooleanAttribute(element: Element, name: string): boolean {
  const value = getRequiredAttribute(element, name);

  if (value === '0') {
    return false;
  }

  if (value === '1') {
    return true;
  }

  throw new Error(`Attribute "${name}" must be 0 or 1.`);
}
