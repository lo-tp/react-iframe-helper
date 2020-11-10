This is a react library meant to simplify the usage of `iframe` component in react web apps with following features:
- Manage the loading status of the `iframe` content.
- Simplify the communication between the parent web app and the inner app.
 
Besides these two main features efforts have also been made to guaranteed security by checking the source origin of the messages.

Another thing worth mentioning for folks using typescript is that the whole lib is written in ts so types will never be a concern.

# What's Under the hood

The idea is very simple. To tell if the app inside the iframe is running properly, just send a query mesage to query the status.

Once it replies then we know is's working.

If we wait for a certain amount of time without receiving the reply we see it as a loading failure.

# Quick Start
Installation is fairly easy: `npm install react-iframe-helper`.

### To  use This Lib At the parent App 
we will invoke the hook firstly.
```js
const { ref, status, onLoad, send } = useIFrameParent({
                                        delay: 50 //default to 500,
                                        childDomain:'http://localhost:3006', //required
                                        listen: listenerCallback,  //optional
                                        count:10  //deafult to 10
                                        })
```
The `count` arg is about how many times we will try the status query and the `delay` arg is the interval in which we will send the query. For example, With the above shown code the status would be marked as failed when we wait for 500ms without receiving the reply.

Apart from that the `childDomain` arg is the domain of the inner app for security check.

Lastly the `listen` arg is used as a callback to handle the message from the inner app.

Having the `useIFrameParent` invoked, the remaining work is just set the `ref` and `onLoad`(returned from the `useIFrameParent` hook) properly for the iframe component.
```js
<iframe
    ref={ref}
    onLoad={onLoad}
    title='forms'
    src={'http://localhost:3006'}
/>
```

Now in the parent app, we can check if status is equal to `IFrameStatus.LOADING`, `IFrameStatus.LOADED` or `IFRameStatus.FAILED` to see the status of the inner app and and send messages to the inner app with `send` returned from the `IFrameParent` hook.

### To  use This Lib At the inner App 
Similiar to how we use the `useIFrameParent` hook, we send the parent domain and a listener: `const { send } = useIFrameChild({parentDomain: 'http://localhost:3000', listen })`.

Then messages from the parent app can be retrieved through the **listen** we send in and to send messages to parent app, just use the `send` method returned.
