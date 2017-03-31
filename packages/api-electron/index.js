'use strict';
const {
  app,
  BrowserWindow,
  ipcMain: ipc
} = require('electron');
const path = require('path');

let win;
const windows = [];
const preloadPath = path.join(__dirname, 'dist', 'ssf-desktop-api.js');

module.exports = (appJson) => {
  const eNotify = require('electron-notify');

  ipc.on('ssf-notification', (e, msg) => {
    if (!msg.options) {
      msg.options = {};
    }

    eNotify.notify({
      title: msg.title,
      text: msg.options.body
    });
  });

  ipc.on('ssf-new-window', (e, msg) => {
    const options = {
      webPreferences: {
        sandbox: true,
        preload: preloadPath
      }
    };

    if (msg.features && msg.features.child) {
      options.parent = BrowserWindow.fromWebContents(e.sender);
    }

    const newWindow = new BrowserWindow(options);
    newWindow.loadURL(msg.url);
    newWindow.on('close', () => {
      const index = windows.indexOf(newWindow);
      if (index >= 0) {
        windows.splice(index, 1);
      }
    });

    e.returnValue = {
      id: newWindow.id
    };

    windows.push(newWindow);
  });

  ipc.on('ssf-capture-screen-snippet', (e) => {
    e.sender.capturePage((image) => {
      const dataUri = 'data:image/png;base64,' + image.toPng().toString('base64');
      e.sender.send('ssf-screen-snippet-captured', dataUri);
    });
  });

  ipc.on('ssf-send-message', (e, msg) => {
    const windowId = parseInt(msg.windowId, 10);

    if (isNaN(windowId)) {
      return;
    }

    const destinationWindow = BrowserWindow.fromId(windowId);

    if (!destinationWindow) {
      return;
    }

    const senderId = e.sender.id;

    // Need to send to topic and * in case the user has subscribed to the wildcard
    destinationWindow.webContents.send(`ssf-send-message-${msg.topic}`, msg.message, senderId);
    destinationWindow.webContents.send(`ssf-send-message-*`, msg.message, senderId);
  });

  createInitialHiddenWindow(appJson);
};

const createInitialHiddenWindow = (appJson) => {
  // Create an invisible window to run the load script
  win = new BrowserWindow({
    width: 800,
    height: 600,
    show: appJson.startup_app.autoShow,
    webPreferences: {
      sandbox: true,
      preload: preloadPath
    }
  });

  // and load the page used for the hidden window
  win.loadURL(appJson.startup_app.url);

  // Emitted when the window is closed.
  win.on('closed', () => {
    win = null;
  });
};

const ready = (cb) => {
  app.on('ready', cb);
};

ipc.on('ssf-get-window-id', (e) => {
  e.returnValue = BrowserWindow.fromWebContents(e.sender).id;
});

ipc.on('ssf-close-window', (e, id) => {
  getWindowFromId(id, (win) => win.close());
});

ipc.on('ssf-show-window', (e, id) => {
  getWindowFromId(id, (win) => win.show());
});

ipc.on('ssf-hide-window', (e, id) => {
  getWindowFromId(id, (win) => win.hide());
});

ipc.on('ssf-focus-window', (e, id) => {
  getWindowFromId(id, (win) => win.focus());
});

ipc.on('ssf-blur-window', (e, id) => {
  getWindowFromId(id, (win) => win.blur());
});

const getWindowFromId = (id, cb) => {
  const win = BrowserWindow.fromId(id);
  if (win) {
    cb(win);
  }
};

const windowToListener = new Map();

ipc.on('ssf-window-subscribe-events', (e, windowId) => {
  if (windowToListener.has(windowId)) {
    if (!windowToListener.get(windowId).includes(e.sender)) {
      pushToMapArray(windowToListener, windowId, e.sender);
    }
  } else {
    windowToListener.set(windowId, [e.sender]);
  }

  getWindowFromId(windowId, (win) => {
    // Override emit to forward all events onto the window so we can handle them there
    const oldEmit = BrowserWindow.prototype.emit;
    win.emit = function() {
      windowToListener.get(windowId).forEach((sender) => {
        if (!win.isDestroyed()) {
          sender.send('ssf-window-event', win.id, ...arguments);
        }
      });
      oldEmit.apply(win, arguments);
    };
  });
});

const pushToMapArray = (map, key, newValue) => {
  const temp = map.get(key);
  temp.push(newValue);
  map.set(key, temp);
};

console.log(windowToListener);

module.exports.app = {
  ready
};
