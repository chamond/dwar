export interface HuntResourceFarmStartProps {
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

export interface HuntResourceFarmStartSnapshot {
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

export class HuntResourceFarmStart {
  private constructor(private readonly props: HuntResourceFarmStartProps) {}

  static create(props: HuntResourceFarmStartProps): HuntResourceFarmStart {
    const serverNumber = props.serverNumber.trim();
    const name = props.name.trim();

    if (serverNumber.length === 0) {
      throw new Error('Farm start server number is required.');
    }

    if (name.length === 0) {
      throw new Error('Farm start resource name is required.');
    }

    assertNonNegativeInteger(props.createdAt, 'Farm start creation time');
    assertNonNegativeInteger(props.finishAt, 'Farm start finish time');
    assertNonNegativeInteger(props.startedAt, 'Farm start server time');
    assertNonNegativeInteger(props.farmStatus, 'Farm start farm status');
    assertNonNegativeInteger(props.professionId, 'Farm start profession id');
    assertNonNegativeInteger(props.status, 'Farm start status');

    return new HuntResourceFarmStart({
      ...props,
      serverNumber,
      name
    });
  }

  isFirstFarmer(): boolean {
    return this.props.firstFarmer;
  }

  getStatus(): number {
    return this.props.status;
  }

  toSnapshot(): HuntResourceFarmStartSnapshot {
    return { ...this.props };
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}
