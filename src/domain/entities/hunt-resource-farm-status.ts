export interface HuntResourceFarmStatusProps {
  serverNumber: string;
  createdAt: number;
  finishAt: number;
  startedAt: number;
  farmStatus: number;
  professionId: number;
  name: string;
  firstFarmer: boolean;
  status: number;
}

export interface HuntResourceFarmStatusSnapshot {
  serverNumber: string;
  createdAt: number;
  finishAt: number;
  startedAt: number;
  farmStatus: number;
  professionId: number;
  name: string;
  firstFarmer: boolean;
  status: number;
}

export class HuntResourceFarmStatus {
  private constructor(private readonly props: HuntResourceFarmStatusProps) {}

  static create(props: HuntResourceFarmStatusProps): HuntResourceFarmStatus {
    const serverNumber = props.serverNumber.trim();
    const name = props.name.trim();

    if (serverNumber.length === 0) {
      throw new Error('Farm status server number is required.');
    }

    if (name.length === 0) {
      throw new Error('Farm status resource name is required.');
    }

    assertNonNegativeInteger(props.createdAt, 'Farm status creation time');
    assertNonNegativeInteger(props.finishAt, 'Farm status finish time');
    assertNonNegativeInteger(props.startedAt, 'Farm status server time');
    assertNonNegativeInteger(props.farmStatus, 'Farm status farm value');
    assertNonNegativeInteger(props.professionId, 'Farm status profession id');
    assertNonNegativeInteger(props.status, 'Farm status value');

    return new HuntResourceFarmStatus({
      ...props,
      serverNumber,
      name
    });
  }

  isFirstFarmer(): boolean {
    return this.props.firstFarmer;
  }

  toSnapshot(): HuntResourceFarmStatusSnapshot {
    return { ...this.props };
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}
