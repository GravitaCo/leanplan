/**
 * Profile's link to stream N12 (notifications). Native push (APNs and FCM) is N12's; until it
 * lands the phone has no push, so every reminder switch shows the web's no-push state and nothing
 * in Profile switches a reminder on or off on the account. Not the web's pushSupported(): that
 * reads the browser's Web Push, which a react-native-web render (the parity check) would have.
 */
export const pushReady = (): boolean => false
