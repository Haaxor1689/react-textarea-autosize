/**
 * <TextareaAutosize />
 */

import { Merge } from 'ts-essentials';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import calculateNodeHeights, { NodeStyling } from './calculateNodeHeights';
import useComposedRef from './useComposedRef';
import useWindowResizeListener from './useWindowResizeListener';

// BREAKING
// no this (there is no this) as second param to `onHeightChange`
// similarly removed this from `onChange`
// removed inputRef
// rename useCacheForDOMMeasurements to cacheMeasurements
// new info - rowHeight
// valueRowCount => rows
// rowCount => visibleRows

type Heights = [number, number, number];
type ResizeArgs = [
  Heights,
  React.Dispatch<React.SetStateAction<Heights>>,
  number?,
  number?
];

type TextareaAutosizeStyle = Merge<
  NonNullable<JSX.IntrinsicElements['textarea']['style']>,
  { height?: number; maxHeight?: number }
>;

type Props = Merge<
  JSX.IntrinsicElements['textarea'],
  {
    style?: TextareaAutosizeStyle;
  }
> & {
  maxRows?: number;
  minRows?: number;
  onHeightChange?: (height: number) => any;
  cacheMeasurements?: boolean;
};

//   componentDidUpdate(prevProps, prevState) {
//     if (this.state.height !== prevState.height) {
//       this.props.onHeightChange(this.state.height, this);
//     }
//   }

const useMutableArgs = <T extends any[]>(
  args: T,
): React.MutableRefObject<T> => {
  const argsRef = React.useRef(args);
  argsRef.current = args;
  return argsRef;
};

const useResizeCallback = (
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  measurementsCache: React.RefObject<NodeStyling | null>,
  readableArgs: React.MutableRefObject<ResizeArgs>,
) =>
  React.useCallback(() => {
    const node = textareaRef.current;

    // check if the condition is OK, previously && was used
    if (!process.env.BROWSER || !node) {
      return;
    }

    const a = readableArgs;
    const b = readableArgs.current;
    const [heights, setHeights, minRows, maxRows] = readableArgs.current;

    const nodeHeights = calculateNodeHeights(
      node,
      measurementsCache,
      minRows,
      maxRows,
    );

    if (!nodeHeights) {
      return;
    }

    const {
      height,
      minHeight,
      maxHeight,
      // rowCount,
      // valueRowCount,
    } = nodeHeights;

    // this.rowCount = rowCount;
    // this.valueRowCount = valueRowCount;

    if (
      heights[0] === height &&
      heights[1] === minHeight &&
      heights[2] === maxHeight
    ) {
      return;
    }

    setHeights([height, minHeight, maxHeight]);
  }, []);

const TextareaAutosize = (
  {
    minRows,
    maxRows,
    onHeightChange: _onHeightChange,
    cacheMeasurements = false,
    // make a copy, so it can be safely mutated
    style: { ...style } = {},
    ...props
  }: Props,
  userRef: React.Ref<HTMLTextAreaElement | null>,
) => {
  const isControlled = props.value !== undefined;
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const measurementsCache = React.useRef<NodeStyling | null>(null);
  // TODO minHeight seems to be unused
  const [heights, setHeights] = React.useState<Heights>([
    style.height || 0,
    -Infinity,
    Infinity,
  ]);
  const [height, minHeight, maxHeight] = heights;

  // clear cache if needed
  if (!cacheMeasurements) {
    measurementsCache.current = null;
  }

  const resizeArgs = useMutableArgs<ResizeArgs>([
    heights,
    setHeights,
    minRows,
    maxRows,
  ]);
  const resizeTextarea = useResizeCallback(
    textareaRef,
    measurementsCache,
    resizeArgs,
  );

  // resize always after mount & update
  React.useEffect(resizeTextarea);
  useWindowResizeListener(resizeTextarea);

  props.ref = useComposedRef(textareaRef, userRef);
  props.onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isControlled) {
      resizeTextarea();
    }
    if (props.onChange) {
      props.onChange(event);
    }
  };
  (props as Props).style = style;

  style.height = height;

  const finalMaxHeight = Math.max(style.maxHeight || Infinity, maxHeight);

  // evaluate if this is needed - what's the use case?
  if (finalMaxHeight < height) {
    style.overflow = 'hidden';
  }

  return <textarea {...props} />;
};

export default React.forwardRef(TextareaAutosize);
