import AbsolutionFeature from './item-feature.mjs';

/** A trait. Shares the vow feature's fields. */
export default class AbsolutionTrait extends AbsolutionFeature {
  static LOCALIZATION_PREFIXES = [
    'ABSOLUTION.Item.base',
    'ABSOLUTION.Item.Feature',
    'ABSOLUTION.Item.Trait',
  ];

  static defaultSource = 'trait';
}
