import {useCallback, useEffect, useRef, useState} from "react"

export  enum IFrameStatus {
  LOADING,
  LOADED,
  FAILED,
}

export type listener = (data:any) => void
export type setter = (data:any) => void

export const useIFrameParent = ({
  delay,
  childDomain,
  listen,
  count: initialCount
}:{
  delay: number,
  childDomain: string,
  listen?: listener 
  count?: number 
}) => {
  const ref = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState(IFrameStatus.LOADING)
  const timerId=useRef(0)
  const count=useRef(initialCount||3)

  const messageListener = useCallback(
    (event) => {
      const { origin, data } = event
      if(origin===childDomain && data.child ){
        if(data['__init__']){
          clearInterval(timerId.current)
          setStatus(IFrameStatus.LOADED)
          window.removeEventListener('message', messageListener)
        }
        else if(listen){
          listen(data.data)
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
      timerId.current=window.setInterval(() => {
        if (count.current===0){
          setStatus(IFrameStatus.FAILED)
          window.removeEventListener('message', messageListener)
          clearInterval(timerId.current)
        } else {
          ref?.current?.contentWindow?.postMessage({ parent: true, '__init__': '__init__' }, childDomain)
          count.current=count.current-1
        }
      }, delay)
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
  listen?: listener 
) => {
  const [initialized, setInitialized]=useState(false)

  const messageListener=useCallback((event:MessageEvent) => {
      const {origin,data}=event;
      if (origin===parentDomain && data.parent){
          if(data['__init__']) {
              setInitialized(true)
              window.parent.postMessage({'__init__':'__init__',child:true},parentDomain);
          } else if(listen) {
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
