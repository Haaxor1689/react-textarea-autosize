type HiddenStyleKey =
  | 'min-height'
  | 'max-height'
  | 'height'
  | 'visibility'
  | 'overflow'
  | 'position'
  | 'z-index'
  | 'top'
  | 'right';

type HiddenStyle = { [key in HiddenStyleKey]: string };

const HIDDEN_TEXTAREA_STYLE: Readonly<HiddenStyle> = {
  'min-height': '0',
  'max-height': 'none',
  height: '0',
  visibility: 'hidden',
  overflow: 'hidden',
  position: 'absolute',
  'z-index': '-1000',
  top: '0',
  right: '0',
};

const forceHiddenStyles = (node: HTMLElement) => {
  Object.keys(HIDDEN_TEXTAREA_STYLE).forEach(key => {
    node.style.setProperty(
      key,
      HIDDEN_TEXTAREA_STYLE[key as HiddenStyleKey],
      'important',
    );
  });
};

export default forceHiddenStyles;
