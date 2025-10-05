import { ITraversalContext } from "../models/ITraversalContext";
import { ITraversalContextNode } from "../models/ITraversalContextNode";

export function current(this: ITraversalContext): ITraversalContextNode | undefined {
    return this.contexts.length ? this.contexts.at(-1) : undefined;
}