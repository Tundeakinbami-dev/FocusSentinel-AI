import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { bindSmartSpectraIpc } from '@smartspectra/node-sdk/main'
import dotenv from 'dotenv'

dotenv.config()
import icon from '../../resources/icon.png?asset'

ipcMain.handle('smartspectra:get-api-key', () => {
  const apiKey = process.env.SMARTSPECTRA_API_KEY

  if (!apiKey) {
    throw new Error('SmartSpectra API key is not configured.')
  }

  return apiKey
})

function isAuthorizedOrigin(requestingUrl: string): boolean {
  try {
    const configuredDevUrl = process.env['ELECTRON_RENDERER_URL']
    if (is.dev && configuredDevUrl) {
      return new URL(requestingUrl).origin === new URL(configuredDevUrl).origin
    }
    return requestingUrl.startsWith('file://')
  } catch {
    return false
  }
}

function createWindow(): void {
  // Create the browser window with hardened security settings.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  bindSmartSpectraIpc(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Validate protocol before opening any URL in external browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsedUrl = new URL(details.url)
      if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') {
        shell.openExternal(details.url)
      } else {
        console.warn(
          `[Security] Blocked external open request with unsafe protocol: ${parsedUrl.protocol}`
        )
      }
    } catch {
      console.warn(`[Security] Blocked malformed URL in setWindowOpenHandler: ${details.url}`)
    }
    return { action: 'deny' }
  })

  // Block in-app navigation away from application content
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAuthorizedOrigin(navigationUrl)) {
      event.preventDefault()
      console.warn(`[Security] Blocked unauthorized in-app navigation to: ${navigationUrl}`)
    }
  })

  // Prevent attachment of untrusted webview tags
  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault()
    console.warn('[Security] Denied attempt to attach webview element.')
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.focustellisense.ai')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Strict camera-only permission request handler (rejecting microphone/audio)
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details: Electron.MediaAccessPermissionRequest) => {
      const requestingUrl = details.requestingUrl || webContents.getURL()
      const isAppPage = isAuthorizedOrigin(requestingUrl)

      // Only allow video camera requests from authorized pages; strictly deny audio
      const isOnlyCameraRequest =
        permission === 'media' &&
        details.mediaTypes?.includes('video') === true &&
        details.mediaTypes?.includes('audio') !== true

      callback(isAppPage && isOnlyCameraRequest)
    }
  )

  // Strict permission check handler
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      if (permission === 'media') {
        const mediaType = (details as { mediaType?: string })?.mediaType
        if (mediaType === 'audio') return false
        return isAuthorizedOrigin(requestingOrigin || webContents?.getURL() || '')
      }
      return false
    }
  )

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
