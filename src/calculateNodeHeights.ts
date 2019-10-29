import { DeepRequired } from 'ts-essentials';
import isBrowser from './isBrowser.macro';
import forceHiddenStyles from './forceHiddenStyles';

type Writable<T> = { -readonly [P in keyof T]-?: T[P] };

type SizingStyleKey =
  | 'borderBottomWidth'
  | 'borderLeftWidth'
  | 'borderRightWidth'
  | 'borderTopWidth'
  | 'boxSizing'
  | 'fontFamily'
  | 'fontSize'
  | 'fontStyle'
  | 'fontWeight'
  | 'letterSpacing'
  | 'lineHeight'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingTop'
  | 'textIndent'
  | 'textTransform'
  | 'width';

const SIZING_STYLE = [
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRightWidth',
  'borderTopWidth',
  'boxSizing',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  // non-standard
  'tabSize',
  'textIndent',
  // non-standard
  'textRendering',
  'textTransform',
  'width',
] as SizingStyleKey[];

type SizingStyle = Pick<CSSStyleDeclaration, SizingStyleKey>;

export type NodeStyling = {
  sizingStyle: Readonly<Required<SizingStyle>>;
  paddingSize: number;
  borderSize: number;
};

type NodeHeights = {
  height: number;
  minHeight: number;
  maxHeight: number;
  rowHeight: number;
  rows: number;
  visibleRows: number;
};

const isIE = isBrowser
  ? !!(document.documentElement as any).currentStyle
  : false;

let hiddenTextarea: HTMLTextAreaElement;

const getSizingStyle = (style: CSSStyleDeclaration): Readonly<SizingStyle> =>
  SIZING_STYLE.reduce(
    (obj, name) => {
      obj[name] = style.getPropertyValue(name);
      return obj;
    },
    {} as SizingStyle,
  );

const getRefinedSizing = (node: HTMLElement) => {
  const style = window.getComputedStyle(node);

  if (!style) {
    return null;
  }

  const sizingStyle = getSizingStyle(style);

  // probably node is detached from DOM, can't read computed dimensions
  if (!sizingStyle.boxSizing) {
    return null;
  }

  const refinedSizing = { style, sizingStyle };
  return refinedSizing as DeepRequired<typeof refinedSizing>;
};

function calculateNodeStyling(node: HTMLElement) {
  const refinedSizing = getRefinedSizing(node);

  if (!refinedSizing) {
    return null;
  }

  const { style, sizingStyle } = refinedSizing;

  // IE (Edge has already correct behaviour) returns content width as computed width
  // so we need to add manually padding and border widths
  if (isIE && sizingStyle.boxSizing === 'border-box') {
    (sizingStyle as Writable<typeof sizingStyle>).width =
      parseFloat(sizingStyle.width) +
      parseFloat(style.borderRightWidth) +
      parseFloat(style.borderLeftWidth) +
      parseFloat(style.paddingRight) +
      parseFloat(style.paddingLeft) +
      'px';
  }

  const paddingSize =
    parseFloat(sizingStyle.paddingBottom) + parseFloat(sizingStyle.paddingTop);

  const borderSize =
    parseFloat(sizingStyle.borderBottomWidth) +
    parseFloat(sizingStyle.borderTopWidth);

  return {
    sizingStyle,
    paddingSize,
    borderSize,
  };
}

export default function calculateNodeHeights(
  textarea: HTMLTextAreaElement,
  cacheRef: React.MutableRefObject<NodeStyling | null>,
  minRows: number | null = null,
  maxRows: number | null = null,
): NodeHeights | null {
  if (!isBrowser) {
    return null;
  }

  if (!hiddenTextarea) {
    hiddenTextarea = document.createElement('textarea');
    forceHiddenStyles(hiddenTextarea);
  }

  if (hiddenTextarea.parentNode === null) {
    document.body.appendChild(hiddenTextarea);
  }

  // Copy all CSS properties that have an impact on the height of the content in
  // the textbox
  const nodeStyling = cacheRef.current
    ? cacheRef.current
    : calculateNodeStyling(textarea);
  cacheRef.current = nodeStyling;

  if (nodeStyling === null) {
    return null;
  }

  const { paddingSize, borderSize, sizingStyle } = nodeStyling;
  const { boxSizing } = sizingStyle;

  // Need to have the overflow attribute to hide the scrollbar otherwise
  // text-lines will not calculated properly as the shadow will technically be
  // narrower for content
  Object.keys(sizingStyle).forEach(key => {
    hiddenTextarea.style[key as SizingStyleKey] =
      sizingStyle[key as SizingStyleKey];
  });
  forceHiddenStyles(hiddenTextarea);
  hiddenTextarea.value = textarea.value || textarea.placeholder || 'x';

  let minHeight = -Infinity;
  let maxHeight = Infinity;
  let height = hiddenTextarea.scrollHeight;

  if (boxSizing === 'border-box') {
    // border-box: add border, since height = content + padding + border
    height = height + borderSize;
  } else if (boxSizing === 'content-box') {
    // remove padding, since height = content
    height = height - paddingSize;
  }

  // measure height of a textarea with a single row
  hiddenTextarea.value = 'x';
  const rowHeight = hiddenTextarea.scrollHeight - paddingSize;

  // Stores the value's rows count rendered in `hiddenTextarea`,
  // regardless if `maxRows` or `minRows` props are passed
  const rows = Math.floor(height / rowHeight);

  if (minRows !== null) {
    minHeight = rowHeight * minRows;
    if (boxSizing === 'border-box') {
      minHeight = minHeight + paddingSize + borderSize;
    }
    height = Math.max(minHeight, height);
  }

  if (maxRows !== null) {
    maxHeight = rowHeight * maxRows;
    if (boxSizing === 'border-box') {
      maxHeight = maxHeight + paddingSize + borderSize;
    }
    height = Math.min(maxHeight, height);
  }

  const visibleRows = Math.floor(height / rowHeight);

  return {
    height,
    minHeight,
    maxHeight,
    rowHeight,
    rows,
    visibleRows,
  };
}
