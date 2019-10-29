import * as React from 'react';

const useWindowResizeListener = (listener: (event: UIEvent) => any) => {
  React.useEffect(() => {
    window.addEventListener('resize', listener);
    return () => {
      window.removeEventListener('resize', listener);
    };
  }, [listener]);
};

export default useWindowResizeListener;
