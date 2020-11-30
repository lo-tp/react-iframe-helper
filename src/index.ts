import { Ref, useCallback, useEffect, useRef, useState } from "react";

export enum IFrameStatus {
  LOADING,
  LOADED,
  FAILED,
}

export type Listener = (data: any) => void;

export interface ParentProp {
  childDomain: string;
  delay?: number;
  count?: number;
  listen?: Listener;
}

export interface ParentResult {
  status: IFrameStatus;
  send: (data: any) => void;
  onLoad: () => void;
  ref: Ref<HTMLIFrameElement>;
}

export const useIFrameParent = ({
  delay = 500,
  childDomain,
  listen,
  count: initialCount = 10,
}: ParentProp): ParentResult => {
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

export interface ChildProp {
  parentDomain: string;
  listen?: Listener;
}

export interface ChildResult {
  send: (data: any) => void;
}

export const useIFrameChild = ({
  parentDomain,
  listen,
}: ChildProp): ChildResult => {
  const messageListener = useCallback(
    (event) => {
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
