import * as React from 'react';

type Writable<T> = { -readonly [P in keyof T]-?: T[P] };

const useComposedRef = <Ref extends HTMLTextAreaElement | null>(
  libRef: React.MutableRefObject<Ref>,
  userRef: React.Ref<Ref>,
) => (ref: Ref) => {
  libRef.current = ref;

  if (!userRef) {
    return;
  }

  if (typeof userRef === 'function') {
    userRef(ref);
    return;
  }

  (userRef as Writable<typeof userRef>).current = ref;
};

export default useComposedRef;
