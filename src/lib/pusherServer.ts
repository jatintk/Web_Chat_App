import Pusher from 'pusher';

declare global {
  // eslint-disable-next-line no-var
  var _pusherServer: Pusher | undefined;
}

export const pusherServer =
  global._pusherServer ??
  new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  });

if (process.env.NODE_ENV !== 'production') {
  global._pusherServer = pusherServer;
}
