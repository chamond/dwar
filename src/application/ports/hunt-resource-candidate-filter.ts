import type { HuntResourceNode } from '../../domain/entities/hunt-resource-node';

export interface HuntResourceCandidateFilter {
  filter(resources: readonly HuntResourceNode[]): readonly HuntResourceNode[];
}
