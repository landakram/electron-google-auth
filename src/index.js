import { parse } from 'url'
import { remote } from 'electron'
import axios from 'axios'
import qs from 'qs'
var google = require('googleapis');
var googleAuth = require('google-auth-library');


const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token'
const GOOGLE_PROFILE_URL = 'https://www.googleapis.com/userinfo/v2/me'

export function signInWithPopup(clientId, redirectUri) {
  return new Promise((resolve, reject) => {
    const authWindow = new remote.BrowserWindow({
      width: 500,
      height: 600,
      show: true,
    })

    // TODO: Generate and validate PKCE code_challenge value
    const urlParams = {
      response_type: 'code',
      redirect_uri: redirectUri,
      client_id: clientId,
      scope: 'profile email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.readonly https://www.google.com/m8/feeds',
    }
    const authUrl = `${GOOGLE_AUTHORIZATION_URL}?${qs.stringify(urlParams)}`

    function handleNavigation (url) {
      const query = parse(url, true).query
      if (query) {
        if (query.error) {
          reject(new Error(`There was an error: ${query.error}`))
        } else if (query.code) {
          // Login is complete
          authWindow.removeAllListeners('closed')
          setImmediate(() => authWindow.close())

          // This is the authorization code we need to request tokens
          resolve(query.code)
        }
      }
    }

    authWindow.on('closed', () => {
      // TODO: Handle this smoothly
      throw new Error('Auth window was closed by user')
    })

    authWindow.webContents.on('will-navigate', (event, url) => {
      handleNavigation(url)
    })

    authWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
      handleNavigation(newUrl)
    })

    authWindow.loadURL(authUrl)
  })
}

export async function refreshAccessToken(refreshToken, clientId, redirectUri) {
  const response = await axios.post(GOOGLE_TOKEN_URL, qs.stringify({
    refresh_token: refreshToken,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'refresh_token',
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  return response.data
}

export async function fetchAccessTokens (code, clientId, redirectUri) {
  const response = await axios.post(GOOGLE_TOKEN_URL, qs.stringify({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  return response.data
}

export async function googleSignIn (clientId, redirectUri) {
  const code = await signInWithPopup(clientId, redirectUri)
  const tokens = await fetchAccessTokens(code)
  return tokens
}

export function getAuthorizedOAuth2Client(tokens) {
  var auth = new googleAuth()
  var oauth2Client = new auth.OAuth2(null, null, null)
  oauth2Client.credentials = tokens
  return oauth2Client
}
