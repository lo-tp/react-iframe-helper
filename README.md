This is a react library meant to simplify the usage of `iframe` component in react web apps with following features:
- Manage the loading status of the `iframe` content.
- Simplify the communication between the parent web app and the inner app.
 
Beside these two main features. Efforts have also been made to guaranteed securities by checking the source origin of the messages.

Another thing worth mentioning for folks using typescript is that the whole lib is written in ts so types will never be a concern.

Installation is fairly easy: `npm install react-iframe-helper`.

### To  use This Lib At the parent App 
we will invoke the hook 
```js
const { ref, status, onLoad, send } = useIFrameParent(50,'http://localhost:3006',listener)
```
The first arg is the delay after which the loading status of the `iframe` would be marked as failed were there no reply from the inner app.

The second arg is the domain of the inner app for security check.

Lastly a third arg which is optional is used as a callback to handle the message from the inner app.

Having the `useIFrameParent` invoked, the remaining work is just set the `ref` and `onLoad`(returned from the `useIFrameParent` hook) properly for the iframe
```js
<iframe
    ref={ref}
    onLoad={onLoad}
    title='forms'
    src={'http://localhost:3006'}
/>
```

Now in the parent app, we can check if status is equal to `IFrameStatus.LOADING`, `IFrameStatus.LOADED` or `IFRameStatus.FAILED` to see the status of the inner app and and send messages to the inner app with `send` return from the `IFrameParent` hook.

### To  use This Lib At the inner App 
Similiar to how we use the `useIFrameParent` hook, we send the parent domain and a listen to it: `const { send } = useIFrameChild('http://localhost:3000', listener)`

Then messages from the parent app can be retried through the **listener** hook we send in and to send messages  to parent just use the `send` method returned.
