import type { MaterialTypeId } from "./enums";

export interface BuiltinTopic {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
}

export interface BuiltinMaterialType {
  readonly id: MaterialTypeId;
  readonly slug: MaterialTypeId;
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
}

export interface BuiltinQuestionType {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly sortOrder: number;
}
