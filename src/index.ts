import { Ref, useCallback, useEffect, useRef, useState } from "react";

export enum IFrameStatus {
  LOADING,
  LOADED,
  FAILED,
}

export type Listener = (data: any) => void;
export type Setter = (data: any) => void;

export const useIFrameParent = ({
  delay = 500,
  childDomain,
  listen,
  count: initialCount = 10,
}: {
  delay?: number;
  childDomain: string;
  listen?: Listener;
  count?: number;
}): {
  status: IFrameStatus;
  onLoad: () => void;
  ref: Ref<HTMLIFrameElement>;
  send: (data: any) => void;
} => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState(IFrameStatus.LOADING);
  const timerId = useRef(0);
  const count = useRef(initialCount);

  const messageListener = useCallback(
    (event) => {
      const { origin, data } = event;
      if (origin === childDomain && data.child) {
        if (data.__init__) {
          clearInterval(timerId.current);
          setStatus(IFrameStatus.LOADED);
        } else if (listen) {
          listen(data.data);
        }
      }
    },
    [timerId, childDomain, listen]
  );

  useEffect(() => {
    window.addEventListener("message", messageListener);
    return () => {
      window.removeEventListener("message", messageListener);
    };
  }, [messageListener]);

  const onLoad = () => {
    count.current = initialCount;
    timerId.current = window.setInterval(() => {
      if (count.current === 0) {
        setStatus(IFrameStatus.FAILED);
        clearInterval(timerId.current);
      } else {
        ref?.current?.contentWindow?.postMessage(
          { parent: true, __init__: "__init__" },
          childDomain
        );
        count.current -= 1;
      }
    }, delay);
  };

  return {
    status,
    onLoad,
    ref,
    send: (data: any) =>
      ref.current?.contentWindow?.postMessage(
        { parent: true, data },
        childDomain
      ),
  };
};

export const useIFrameChild = (
  parentDomain: string,
  listen?: Listener
): { send: (data: any) => void } => {
  const messageListener = useCallback(
    (event: MessageEvent) => {
      const { origin, data } = event;
      if (origin === parentDomain && data.parent) {
        if (data.__init__) {
          window.parent.postMessage(
            { __init__: "__init__", child: true },
            parentDomain
          );
        } else if (listen) {
          listen(data.data);
        }
      }
    },
    [parentDomain, listen]
  );

  useEffect(() => {
    window.addEventListener("message", messageListener);
    return () => {
      window.removeEventListener("message", messageListener);
    };
  }, [messageListener]);
  return {
    send: (data: any) =>
      window.parent.postMessage({ child: true, data }, parentDomain),
  };
};
