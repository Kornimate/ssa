import { IBasicBlock } from "./IBasicBlock";

export interface ICFG {
  entry: IBasicBlock;
  exit: IBasicBlock;
}