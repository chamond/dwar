import type { ResourceRepository } from '../../application/ports/resource-repository';
import { HuntMob } from '../../domain/entities/hunt-mob';
import { HuntResourceNode } from '../../domain/entities/hunt-resource-node';
import { HuntZoneScan } from '../../domain/entities/hunt-zone-scan';
import { MapPosition } from '../../domain/entities/map-position';

export class DwarHuntZoneXmlParser {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  parse(xmlText: string): HuntZoneScan {
    const document = new DOMParser().parseFromString(xmlText, 'application/xml');
    const parserError = document.querySelector('parsererror');

    if (parserError) {
      throw new Error('Hunt zone response is not valid XML.');
    }

    if (document.documentElement.nodeName !== 'hunt') {
      throw new Error('Hunt zone response has an unexpected root element.');
    }

    return HuntZoneScan.create({
      mobs: this.parseMobs(document),
      resources: this.parseResources(document)
    });
  }

  private parseMobs(document: Document): readonly HuntMob[] {
    return Array.from(document.querySelectorAll('hunt > bots > bot')).map((element) => {
      return HuntMob.create({
        id: getRequiredAttribute(element, 'id'),
        name: getRequiredAttribute(element, 'name'),
        level: getIntegerAttribute(element, 'level'),
        kind: getIntegerAttribute(element, 'kind'),
        picture: getRequiredAttribute(element, 'pic'),
        skill: getIntegerAttribute(element, 'sk'),
        aggressionLevel: getIntegerAttribute(element, 'agrlevel'),
        position: MapPosition.create({
          x: getIntegerAttribute(element, 'x'),
          y: getIntegerAttribute(element, 'y')
        }),
        fightId: getIntegerAttribute(element, 'fight_id'),
        articleId: getIntegerAttribute(element, 'artikul_id'),
        isHidden: getBooleanAttribute(element, 'hidden')
      });
    });
  }

  private parseResources(document: Document): readonly HuntResourceNode[] {
    return Array.from(document.querySelectorAll('hunt > farm > item')).flatMap((element) => {
      const articleId = getIntegerAttribute(element, 'artikul_id');
      const resource = this.resourceRepository.findByArticleId(articleId);

      if (!resource) {
        return [];
      }

      return [
        HuntResourceNode.create({
          serverNumber: getRequiredAttribute(element, 'num'),
          resource,
          professionId: getIntegerAttribute(element, 'prof'),
          quality: getIntegerAttribute(element, 'quality'),
          requiredSkill: getIntegerAttribute(element, 'skill'),
          position: MapPosition.create({
            x: getIntegerAttribute(element, 'x'),
            y: getIntegerAttribute(element, 'y')
          }),
          isBeingFarmed: getBooleanAttribute(element, 'farming'),
          actionTitle: getOptionalAttribute(element, 'action_title')
        })
      ];
    });
  }
}

function getRequiredAttribute(element: Element, name: string): string {
  const value = element.getAttribute(name);

  if (value === null) {
    throw new Error(`Missing "${name}" attribute in hunt zone response.`);
  }

  return value;
}

function getOptionalAttribute(element: Element, name: string): string {
  return element.getAttribute(name) ?? '';
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
