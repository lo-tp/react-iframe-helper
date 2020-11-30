import {
  act,
  renderHook,
  RenderHookResult,
} from "@testing-library/react-hooks";
import React from "react";
import {
  ChildProp,
  ChildResult,
  DEFAULT_COUNT,
  DEFAULT_DELAY,
  IFrameStatus,
  ParentProp,
  ParentResult,
  useIFrameChild,
  useIFrameParent,
} from "..";

describe("useIFrameChild shold work properly", () => {
  const listen = jest.fn();
  const parentDomain = "http://www.parentDomain.com";
  let messageListener: EventListener;
  let mockedPostMessage: jest.Mock;
  let removeEventListener: jest.Mock;
  let hook: RenderHookResult<ChildProp, ChildResult>;

  beforeAll(() => {
    global.setInterval = jest.fn();
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
    global.parent.postMessage = jest.fn();
    hook = renderHook(() =>
      useIFrameChild({
        listen,
        parentDomain,
      })
    );
    const mockedAddEventListener = global.addEventListener as jest.Mock;
    removeEventListener = global.removeEventListener as jest.Mock;
    mockedPostMessage = global.parent.postMessage as jest.Mock;
    [[, messageListener]] = mockedAddEventListener.mock.calls.filter(
      (call) => call[0] === "message"
    );
  });

  beforeEach(() => {
    mockedPostMessage.mockClear();
    listen.mockClear();
  });

  test("should respond to initial query from parent", () => {
    const data = {
      parent: true,
      __init__: true,
    };
    act(() =>
      messageListener(
        new MessageEvent("message", {
          origin: parentDomain,
          data,
        })
      )
    );
    expect(mockedPostMessage.mock.calls).toEqual([
      [
        {
          __init__: "__init__",
          child: true,
        },
        parentDomain,
      ],
    ]);
  });

  test("should invoke the listen callback properly when receiving a non-init message", () => {
    const data = {
      parent: true,
      data: "data strings",
    };
    act(() =>
      messageListener(
        new MessageEvent("message", {
          origin: parentDomain,
          data,
        })
      )
    );
    expect(mockedPostMessage.mock.calls).toEqual([]);
    expect(listen.mock.calls).toEqual([["data strings"]]);
  });

  test("should do nothing when receiving a message not from the parent", () => {
    const data = {
      parent: true,
      data: "data strings",
    };
    act(() =>
      messageListener(
        new MessageEvent("message", {
          origin: "fake domain",
          data,
        })
      )
    );
    expect(mockedPostMessage.mock.calls).toEqual([]);
    expect(listen.mock.calls).toEqual([]);
  });

  test("should send message to parent properly", () => {
    const data = "data string";
    hook.result.current.send(data);
    expect(mockedPostMessage.mock.calls).toEqual([
      [{ child: true, data }, parentDomain],
    ]);
  });

  test("should unregister event listener properly", () => {
    expect(
      removeEventListener.mock.calls.filter(([type]) => type === "message")
    ).toEqual([]);
    act(() => {
      hook.unmount();
    });
    expect(
      removeEventListener.mock.calls.filter(([type]) => type === "message")
    ).toEqual([["message", messageListener]]);
  });
});

describe("useIframeParent should mark status as FAILED when fail to hand shake with the child for count times", () => {
  const listen = jest.fn();
  const childDomain = "http://www.childDomain.com";
  const mockedPostMessage = jest.fn();
  let setIntervalListener: jest.Mock;
  let clearIntervalListener: jest.Mock;
  let hook: RenderHookResult<ParentProp, ParentResult>;
  beforeAll(() => {
    global.clearInterval = jest.fn();
    global.setInterval = jest.fn().mockReturnValue(5);
    global.parent.postMessage = jest.fn();
    const { useRef: realUseRef } = React;
    // eslint-disable-next-line
    // @ts-ignore
    jest.spyOn(React, "useRef").mockImplementation((initialVal) =>
      initialVal === null
        ? {
            current: { contentWindow: { postMessage: mockedPostMessage } },
          }
        : realUseRef("react")
    );
    hook = renderHook(() =>
      useIFrameParent({
        listen,
        childDomain,
      })
    );
    setIntervalListener = global.setInterval as jest.Mock;
    clearIntervalListener = global.clearInterval as jest.Mock;
  });
  test("call setInterVal with the correct args", () => {
    const {
      result: {
        current: { onLoad },
      },
    } = hook;
    onLoad();
    expect(setIntervalListener.mock.calls[0][1]).toBe(DEFAULT_DELAY);
  });
  test("should set status properly when fail to hand shake for over count times", () => {
    const {
      result: {
        current: { onLoad },
      },
    } = hook;
    onLoad();
    let count = DEFAULT_COUNT;
    const intervalCallback = setIntervalListener.mock.calls[0][0];
    expect(clearIntervalListener.mock.calls).toEqual([]);
    expect(mockedPostMessage.mock.calls).toEqual([]);
    while (count) {
      expect(hook.result.current.status).toBe(IFrameStatus.LOADING);
      act(() => {
        intervalCallback();
      });
      expect(mockedPostMessage.mock.calls).toEqual([
        [{ parent: true, __init__: "__init__" }, childDomain],
      ]);
      mockedPostMessage.mockClear();
      count -= 1;
    }
    act(() => {
      intervalCallback();
    });
    expect(mockedPostMessage.mock.calls).toEqual([]);
    expect(hook.result.current.status).toBe(IFrameStatus.FAILED);
    expect(clearIntervalListener.mock.calls).toEqual([[5]]);
  });
});
