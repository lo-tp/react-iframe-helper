import {useCallback, useEffect, useRef, useState} from "react"

export  enum IFrameStatus {
  INITIALIZED,
  LOADED,
  FAILED,
}

export type listener = (data:any) => void
export type setter = (data:any) => void

export const useIFrameParent = (
  delay: number,
  childDomain: string,
  listen: listener
) => {
  const ref = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState(IFrameStatus.INITIALIZED)
  const [timerId, setTimerId] = useState(0)

  const messageListener = useCallback(
    (event) => {
      const { origin, data } = event
      if(origin===childDomain && data.child ){
        if(status===IFrameStatus.LOADED){
          listen(data.data)
        }
        else{
          clearTimeout(timerId)
          setStatus(IFrameStatus.LOADED)
          window.removeEventListener('message', messageListener)
        }
      }
    },
    [timerId, childDomain, status, listen]
  )

  useEffect(() => {
    if (timerId) {
      window.addEventListener('message', messageListener)
    }
    return () => {
      window.removeEventListener('message', messageListener)
    }
  }, [messageListener, timerId])

  const onLoad = () => {
    ref?.current?.contentWindow?.postMessage({ parent: true, hello: 123 }, childDomain)
    setTimerId(
      window.setTimeout(() => {
        setStatus(IFrameStatus.FAILED)
        window.removeEventListener('message', messageListener)
      }, delay)
    )
  }

  return {
    status,
    onLoad,
    ref,
    send: (data:any) => ref.current?.contentWindow?.postMessage({parent:true, data},childDomain)
  }
}

export const useIFrameChild = (
  parentDomain: string,
  listen: listener
) => {
  const [initialized, setInitialized]=useState(false)

  const messageListener=useCallback((event:MessageEvent) => {
      const {origin,data}=event;
      if (origin===parentDomain && data.parent){
          if(!initialized) {
              setInitialized(true)
              window.parent.postMessage({child:true},parentDomain);
          } else {
            listen(data.data)
          }
      }
    },[initialized,parentDomain,listen])

  useEffect(() => {
    window.addEventListener('message',messageListener);
    return () => {
      window.removeEventListener('message', messageListener)
    }
  },[messageListener]);
  return {
    send: (data: any) => window.parent.postMessage({child:true, data},parentDomain)
  }
}
