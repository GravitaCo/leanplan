// Order matters: the browser stand-ins go in before any shared code (the store) is loaded.
import './lib/platform/install'
// the session refreshes while the app is open, as the web's does while its tab shows
import './lib/platform/authRefresh'
import 'expo-router/entry'
