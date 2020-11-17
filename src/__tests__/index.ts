import {
  act,
  renderHook,
  RenderHookResult,
} from "@testing-library/react-hooks";
import * as reactExport from "react";
import { ChildProp, ChildResult, useIFrameChild } from "..";

describe("useIFrameChild shold work properly", () => {
  const listen = jest.fn();
  const parentDomain = "http://www.parentDomain.com";
  let messageListener: EventListener;
  let mockedPostMessage: jest.Mock;
  let removeEventListener: jest.Mock;
  let hook: RenderHookResult<ChildProp, ChildResult>;
  let cleanUp: void | (() => void | undefined);

  beforeAll(() => {
    jest.spyOn(reactExport, "useEffect").mockImplementation((func) => {
      cleanUp = func();
    });
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
    // @ts-ignore 2349
    cleanUp();
    expect(
      removeEventListener.mock.calls.filter(([type]) => type === "message")
    ).toEqual([["message", messageListener]]);
  });
});
